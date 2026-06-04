# whisper.cpp STT Review

## Decision

`ggml-org/whisper.cpp` can run on the current shared Ubuntu server, but the safe production scope is limited to a single CPU-only `tiny` or `base` model service with strict request serialization. `small` may start, but it is not a good default on this host because the server has only 1.9 GiB RAM and already runs multiple application containers.

For Korean transcription quality, `base` is the minimum practical candidate. `tiny` is useful as a smoke-test and low-latency fallback, but it is likely too weak for product STT quality.

## Current Server Snapshot

- Host: `biblabely`, `115.68.177.250`, Ubuntu Linux `6.8.0-117-generic`.
- CPU: 2 vCPU, AMD Ryzen 7 7840HS virtualized under KVM, AVX2 and AVX512 available.
- Memory: 1.9 GiB total, about 852 MiB available at the time of inspection.
- Swap: 14 GiB total, about 1.0 GiB already used.
- Disk: 48 GiB root volume, 15 GiB available before benchmark cleanup.
- Existing containers include `teacher-bo-server`, `teacher-bo-rag`, `biblabely-vad`, `biblabely-analysis`, `biblabely-server`, `hidden-bites-server`, `tab-monitor-server`, `mysql`, and `redis`.
- `biblabely_network` and `redis_network` already exist and match the current Teacher Bo backend deployment pattern.

## Measured Benchmarks

Benchmarks were run with the official `ghcr.io/ggml-org/whisper.cpp:main` Docker image on the production host, using CPU-only execution with `-t 2`.

- `tiny` multilingual model:
  - Model file: 75 MiB.
  - Reported CPU model size: 77.11 MiB.
  - Bench total time: 9177.08 ms.
  - Load time: 270.14 ms.

- `base` multilingual model:
  - Model file: 142 MiB.
  - Container memory limit used during test: 768 MiB.
  - Reported CPU model size: 147.37 MiB.
  - Bench total time: 16184.48 ms.
  - Load time: 185.60 ms.

The downloaded benchmark models and official Docker image were removed after the test, and disk usage returned to 34 GiB used / 15 GiB available.

## Integration Fit

The current server path is `client Socket.IO audioChunk -> server/src/transcribe/audio.gateway.ts -> server/src/transcribe/transcribe.service.ts -> AWS Transcribe Streaming`. VAD is already a separate HTTP service at `VAD_SERVER_URL=http://biblabely-vad:8094`.

The best fit is to add a separate internal STT container, for example `teacher-bo-whisper`, on `biblabely_network`, then inject `STT_SERVER_URL=http://teacher-bo-whisper:8098` into `teacher-bo-server`. The NestJS `TranscribeService` should keep the existing Socket.IO event contract and delegate transcription to this internal service instead of creating an AWS Transcribe stream.

The official `whisper-server` is file-upload oriented over HTTP. It is usable for utterance-level transcription after VAD ends, but it is not a drop-in replacement for Amazon Transcribe's partial streaming event model. If the product needs live partial subtitles, a small wrapper service should own chunk buffering and call `whisper.cpp` per utterance or maintain a custom streaming process.

## Recommended Deployment Shape

- Add a `whisper-server/` or `stt-server/` Docker image that uses `ghcr.io/ggml-org/whisper.cpp:main` or builds whisper.cpp from source.
- Persist models under `/opt/teacher-bo/whisper-models` on the host or bake the selected model into the image for reproducible Actions deploys.
- Add ECR repository `teacher-bo-whisper`.
- Add a reusable `build-whisper.yml` and extend `deploy-backend.yml`.
- Create and run `teacher-bo-whisper` with:
  - `--network=biblabely_network`
  - no published host port
  - `--cpus=2`
  - `--memory=768m` for `base`, lower only if benchmarking confirms stability
  - `STT_MODEL=base`
  - `STT_THREADS=2`
- Add a deployment health check from `biblabely_network`.
- Keep Amazon Polly credentials because Polly is separate from Transcribe and still used by `server/src/polly`.

## Risk

- `base` can run, but concurrent requests will contend with every other service on a 2 vCPU host.
- `small` has better Korean quality but is risky on this RAM budget, especially with `biblabely-analysis` and other containers active.
- Swap makes the process survive but can produce poor latency.
- The current `.codex/config.toml` SSH MCP entry uses a literal-looking value in `--password-env`; the runner expects an environment variable name. Direct MCP calls failed with `Permission denied (publickey)` until the runner was invoked with the environment variable wiring corrected.

## Recommendation

Proceed only if the first implementation is an internal, serialized, CPU-only `base` service with a fallback to `tiny` for smoke testing. Do not remove all AWS Transcribe code in the first pass; keep a provider switch so production can roll back quickly if Korean accuracy or latency is not acceptable on this host.

## Test Route Implementation

On 2026-06-04, a separate `/test` Expo Router page was added for whisper.cpp testing without replacing the existing voice-chat or AWS Transcribe Streaming path.

- Client route: `client/app/test.tsx`.
- Client stack registration: `client/app/_layout.tsx`.
- Test API: `POST /api/test/whisper`, implemented under `server/src/test`.
- Test health API: `GET /api/test/whisper/health`.
- The server endpoint accepts multipart `audio`, forwards it to `STT_SERVER_URL/inference`, and normalizes whisper.cpp output into `text`, `segments`, `durationMs`, `model`, `language`, and `serviceUrl`.
- Existing `server/src/transcribe` Socket.IO and AWS Transcribe code remains unchanged.
- Backend deploy now starts `teacher-bo-whisper` on `biblabely_network` with the official `ghcr.io/ggml-org/whisper.cpp:main` image, model files under `/opt/teacher-bo/whisper-models`, no host port, `WHISPER_MODEL=base`, `WHISPER_THREADS=2`, `WHISPER_CPUS=2`, and `WHISPER_MEMORY=768m`.
- `teacher-bo-server` receives `STT_SERVER_URL=http://teacher-bo-whisper:8098` and `STT_MODEL`.
- `client/scripts/copy-canvaskit.js` makes `yarn export:web` copy `canvaskit.wasm` into `_expo/static/js/web/`, matching the deployed Skia asset path during local and Actions exports.
- Client production verification now checks both `/` and `/test` route asset references.

Validation completed during implementation:

- `cd server && yarn test whisper-test.service --runInBand`
- `cd server && yarn type-check`
- `cd server && yarn lint:check`
- `cd client && npx tsc --noEmit`
- `cd client && yarn lint`
- `cd client && yarn export:web`
- Playwright opened `/test` through a local static fallback server and verified the route renders the upload controls, offline health state, and result surface.

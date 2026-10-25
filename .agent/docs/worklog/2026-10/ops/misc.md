# ops 작업 로그 (2026-10)

## 서버 Node 20 → 22 (2026-10-25)

`server/Dockerfile` 세 스테이지의 `node:20-alpine` 을 `node:22-alpine` 으로, CI(`build-server`·`deploy-client`)의 `node-version: "20"` 을 `"22"` 로 바꿨다.

- Node 20 은 2026-04-30 에 지원이 끝나 2026-10-21 보안 릴리스(22.23.4·24.22.1·26.12.1) 같은 패치를 더는 받지 못한다.
  ECR `teacher-bo-server` 최신 이미지(2026-08-25 빌드)의 `NODE_VERSION` 은 20.20.2 였다.
- 이번 릴리스의 최고 위험은 Brotli 디코더 원격 코드 실행(CVE-2026-111497). 서버는 Nest 11 + Express 5 라 body-parser 2.x 가
  `Content-Encoding: br` 요청 본문을 `node:zlib` 로 풀어 인증 전 요청으로 취약 경로에 닿는다.
- 22 를 고른 이유: 다른 서버(branches·trending·monkmate 등)와 같은 메이저. 22 는 2027-04 에 지원이 끝나니 그 전에 24 로 다시 올려야 한다.
- 로컬 `docker build` 로 `server` 이미지를 22-alpine 에서 빌드하고 `bcrypt`·`@prisma/client` 로드와 `dist/src/main.js` 생성을 확인했다.
- `deploy-backend.yml` 은 `main` push 중 `server/**`·워크플로 변경에 걸리므로 이 PR 을 머지하면 바로 백엔드가 재배포된다.
- `rag-server`·`silero-vad` 는 Python 이미지라 해당 없다. `client/eas.json` 의 `"node": "22.14.0"` 은 EAS 빌드 머신에서만 쓰여 건드리지 않았다.

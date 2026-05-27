# Server Deployment

Teacher Bo backend production deployment runs Docker containers on the shared production server.

## Containers

- `teacher-bo-server`: NestJS GraphQL and Socket.IO server, host port `8095`.
- `teacher-bo-rag`: FastAPI RAG server, internal port `8096`.
- `biblabely-vad`: existing VAD server from `NLP-Biblabely`, internal port `8094`.
- `redis`: global Redis container for RAG session history, internal only.

## Networks

- `biblabely_network`: `teacher-bo-server`, `teacher-bo-rag`, `biblabely-vad`.
- `redis_network`: `teacher-bo-rag`, `redis`.

## GitHub Actions

- `.github/workflows/build-server.yml`: checks, builds, and pushes `teacher-bo-server`.
- `.github/workflows/build-rag.yml`: builds ChromaDB, checks RAG server, and pushes `teacher-bo-rag`.
- `.github/workflows/deploy-backend.yml`: SSH deploys containers to the production server.
- `.github/workflows/deploy-client.yml`: exports Expo web, uploads to `s3://teacher-bo-production/client-build/`, and invalidates CloudFront distribution `E2QWFNXPUVRKJE`.

## Client Hosting

- S3 bucket: `teacher-bo-production`
- CloudFront distribution: `E2QWFNXPUVRKJE`
- CloudFront domain: `dhtb31jlmkwpp.cloudfront.net`
- Desired client domain: `teacher-bo.leed.at`
- API URL: `https://b92c_b9ejghdi28.leed.at`
- `teacher-bo.leed.at` is not attached yet because the current DNS CNAME points to another CloudFront distribution outside the default AWS account.
- Nginx vhost template: `infra/nginx/teacher-bo.conf`
- The API vhost must proxy `/api/*`, `/health`, `/socket.io`, and `/api/socket.io` to `teacher-bo-server` on port `8095`.

## Required Secrets

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `SERVER_HOST`
- `SERVER_USERNAME`
- `SERVER_PASSWORD`
- `SSH_PRIVATE_KEY`
- `OPENAI_API_KEY`
- `DEEPINFRA_API_KEY`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `TRANSCRIBE_S3_BUCKET`
- `TRANSCRIBE_VOCABULARY_FILTER_NAME`

## Optional Variables And Secrets

- `CLIENT_URL`
- `CLIENT_PUBLIC_URL`
- `CLIENT_PUBLIC_API_URL`
- `CLIENT_ENV`
- `JWT_EXPIRES_IN`
- `RAG_HISTORY_TTL_SECONDS`
- `DEEPINFRA_BASE_URL`
- `RAG_EMBEDDING_MODEL`
- `RAG_EMBEDDING_QUERY_INSTRUCTION`
- `RAG_EMBEDDING_BATCH_SIZE`
- `LANGCHAIN_TRACING_V2`
- `LANGCHAIN_ENDPOINT`
- `LANGCHAIN_API_KEY`
- `LANGCHAIN_PROJECT`

## Health Checks

- Main server: `http://127.0.0.1:8095/health`
- RAG server: `http://teacher-bo-rag:8096/api/v1/health` from `biblabely_network`
- VAD server: `http://biblabely-vad:8094/health` from `biblabely_network`
- Redis: authenticated `PING` from `redis_network`

## Runtime Verification

- Client runtime: `cd client && yarn verify:production`
- Server CORS preflight: `OPTIONS https://b92c_b9ejghdi28.leed.at/api/graphql` from `https://teacher-bo.leed.at`
- Socket.IO: websocket transport to `wss://teacher-bo.leed.at/socket.io`

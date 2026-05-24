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

## Required Secrets

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `SERVER_HOST`
- `SERVER_USERNAME`
- `SERVER_PASSWORD`
- `SSH_PRIVATE_KEY`
- `OPENAI_API_KEY`
- `UPSTAGE_API_KEY`
- `REDIS_PASSWORD`
- `JWT_SECRET`

## Optional Variables And Secrets

- `CLIENT_URL`
- `JWT_EXPIRES_IN`
- `RAG_HISTORY_TTL_SECONDS`
- `LANGCHAIN_TRACING_V2`
- `LANGCHAIN_ENDPOINT`
- `LANGCHAIN_API_KEY`
- `LANGCHAIN_PROJECT`

## Health Checks

- Main server: `http://127.0.0.1:8095/health`
- RAG server: `http://teacher-bo-rag:8096/api/v1/health` from `biblabely_network`
- VAD server: `http://biblabely-vad:8094/health` from `biblabely_network`
- Redis: authenticated `PING` from `redis_network`

# Teacher Bo

**실시간 대화형 AI 보드게임 도우미**

서강대학교 산학프로젝트 - 보선생팀

## Resources

- [문제 인식 영상 (YouTube)](https://www.youtube.com/watch?v=zj_kYvwl5Hg)
- [중간평가 영상 (YouTube)](https://www.youtube.com/watch?v=jJdUVBK_UEU)
- [보선생 포스터](./assets/teacerbo-poster.pdf)
- [보선생 팜플렛](./assets/teacherbo-pamphlet.pdf)
- [RAG SYSTEM 설명 README](./RAG_SYSTEM.md)

## 프로젝트 배경

**1. 보드게임을 할 때 룰북을 찾아보는 번거로움**

게임 중 의견이 엇갈리는 상황에 룰북을 찾아보는 데에 많은 시간 소요

→ 음성을 통한 간편한 질문과 답변

**2. 기존 LLM의 한계**

GPT, Gemini 등 기존 LLM의 부정확한 답변 (Hallucination)

→ 룰북에 근거한 신뢰성 있는 답변

## 기존 서비스들과 차별점

<img width="948" height="437" alt="스크린샷 2025-12-08 16 15 22" src="https://github.com/user-attachments/assets/bf1b1ad1-5734-43fc-8ecc-680d6b4cc41f" />

## 프로젝트 소개

Teacher Bo는 보드게임 플레이어들이 게임 규칙을 쉽게 이해하고 궁금한 점을 실시간으로 해결할 수 있도록 돕는 AI 챗봇 서비스입니다. RAG(Retrieval-Augmented Generation) 기술을 활용하여 정확한 규칙 정보를 제공하며, 음성 인식 및 TTS 기능을 통해 자연스러운 대화형 인터페이스를 제공합니다.

## 주요 기능

- **보드게임 규칙 질의응답**: RAG 기반으로 정확한 게임 규칙 안내
- **음성 인식 및 TTS**: 자연스러운 음성 대화 지원
- **실시간 스트리밍**: WebSocket 기반 실시간 대화
- **다양한 플랫폼 지원**: iOS, Android, Web 크로스 플랫폼 지원

## Dev Environment

### Global

- **Node.js**: >= 18.0.0
- **Yarn**: 1.22.22
- **Python**: 3.13
- **Docker**: 최신 버전
- **Package Manager**: pipenv (Python)

### Frontend

- **Framework**: React Native (Expo)
- **UI**: Expo Router, React Native Reanimated
- **State Management**: Apollo Client
- **Language**: TypeScript

### Backend

- **Framework**: NestJS
- **Database**: PostgreSQL (Prisma ORM)
- **API**: GraphQL (Apollo Server), REST, WebSocket
- **Language**: TypeScript

### AI/ML

- **LLM**: OpenAI GPT-4o-mini
- **Embeddings**: Upstage Solar Embeddings
- **Vector DB**: ChromaDB
- **Framework**: LangChain, FastAPI
- **VAD**: Silero VAD

## 모노레포 구조

이 프로젝트는 모노레포로 관리되며, 각 폴더는 독립적인 기능을 담당합니다.

### `/client`

React Native(Expo) 기반 크로스 플랫폼 모바일/웹 클라이언트

- iOS, Android, Web 지원
- 음성 인식 및 TTS 기능
- 실시간 채팅 인터페이스
- 보드게임 룰북 뷰어

### `/server`

NestJS 기반 메인 백엔드 서버

- GraphQL API 및 WebSocket 지원
- AWS Transcribe/Polly 통합

### `/rag-server`

FastAPI 기반 RAG(Retrieval-Augmented Generation) 서버

- 보드게임 규칙 질의응답 API
- ChromaDB 벡터 검색
- LangChain 기반 대화 체인
- DynamoDB 세션 관리

### `/rag-vector-db-generator`

보드게임 룰북을 벡터 데이터베이스로 변환하는 임베딩 생성기

- PDF/JSON 룰북 로더
- Upstage Solar Embeddings
- ChromaDB 저장 및 검색 테스트

### `/silero-vad`

Silero VAD 모델 기반 음성 활동 감지(Voice Activity Detection) 서버

- FastAPI 기반 REST API
- 실시간 음성 감지
- 스트리밍 오디오 지원

### `/infra`

인프라 설정 및 배포 관련 파일

- AWS Transcribe vocabulary filter
- 기타 인프라 구성

## 시작하기

### Prerequisites

```bash
# Node.js 및 Yarn 설치
node --version  # >= 18.0.0
yarn --version  # 1.22.22

# Python 및 pipenv 설치
python3 --version  # 3.13
pip install pipenv

# Docker 설치 및 실행
docker --version
```

### 환경 변수 설정

각 서비스 폴더에 `.env` 파일을 생성해야 합니다. `.env.example` 파일을 참고하세요.

### Client 실행

```bash
cd client
yarn install
yarn start
```

### Server 실행

```bash
cd server
yarn install
yarn start:dev
```

### RAG Server 실행

```bash
cd rag-server
pip install -r requirements.txt
fastapi dev app/main.py
```

### Silero VAD Server 실행

```bash
cd silero-vad
pipenv install
pipenv run python main.py
```

## Contributors

<a href="https://github.com/teacher-bo/teacher-bo/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=teacher-bo/teacher-bo" />
</a>

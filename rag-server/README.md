# RAG Server - 보드게임 규칙 전문가 챗봇 API

## Quick Start

```bash
sh init.sh                      # 통합 관리 시스템 (안내 절차 따라서 자동세팅 가능)
# 사전에 .env 파일 주입
# `rag-vector-db-generator` 폴더에서 chroma_db 생성해서 주입
# 이후 아래 절차 따라 진행

python -m venv .venv            # 가상 환경 생성

source .venv/bin/activate       # 가상 환경 ON

pip install -r requirements.txt # 패키지 설치

fastapi dev app/main.py         # 서버 시작
```

## `/chat` 동작 방식 요약

- **/api/v1/chat으로 질문 시, history를 Redis에서 SessionId를 Key로 불러옴**

  - SessionId는 `teacher-bo:rag:history:{session_id}` 키로 저장됨.
  - 기본 TTL은 `RAG_HISTORY_TTL_SECONDS=86400`이며, 최근 질문/답변 1쌍만 유지함.
  - 운영에서는 Docker 내부 `redis_network`의 `redis:6379`를 사용함.

- **질문을 바탕으로 retrieve_context를 chroma_db에서 유사도 분석으로 불러옴**

  - 이때, chroma_db 생성은 `rag-vector-db-generator` 폴더에서 관리됨.
  - `rag-vector-db-generator` 폴더에 변경이 감지되면, github actions에서 자동으로 chroma_db 폴더를 만들고 RAG Docker image에 포함함.
  - 문서 임베딩과 런타임 질문 임베딩은 DeepInfra `Qwen/Qwen3-Embedding-8B`로 통일함.
  - 질문 임베딩에는 `RAG_EMBEDDING_QUERY_INSTRUCTION` 기반 `Instruct: ...\nQuery: ...` prefix를 적용함.
  - 로컬에서 개발 시 `rag-vector-db-generator` 폴더에서 `embed_and_store.py` 돌려서 chroma_db 만들어서 수동으로 `rag-server` 폴더에 넣어줘야함.

- **위 2개를 조합해서 LLM 모델에 넘겨주고, 답변을 받아옴**
  - 이때, 답변은 YES, NO, OTHERS로 분류됨

## 🏗️ 프로젝트 구조

```
rag-server/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 앱
│   ├── config/              # 설정
│   │   ├── games.py         # 게임 설정
│   │   └── prompts.py       # 프롬프트 템플릿
│   ├── core/                # 핵심 로직
│   │   ├── vectorstore.py   # ChromaDB 로딩
│   │   ├── chain.py         # RAG 체인
│   │   └── memory.py        # 대화 기록 관리
│   ├── models/              # 데이터 모델
│   │   └── schemas.py       # Pydantic 스키마
│   └── routers/             # API 라우터
│       └── chat.py          # 채팅 엔드포인트
├── chroma_db/               # 벡터 데이터베이스
├── example/                 # 원본 CLI 코드
├── .env                     # 환경 변수
├── .gitignore
└── requirements.txt
```

## 🔧 기술 스택

- **Framework**: FastAPI
- **LLM**: OpenAI GPT-4o-mini
- **Embeddings**: DeepInfra Qwen3 Embedding 8B
- **Vector DB**: ChromaDB
- **RAG Framework**: LangChain

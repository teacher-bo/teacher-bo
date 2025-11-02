# RAG Server - 보드게임 규칙 전문가 챗봇 API

## Quick Start

```bash
# 사전에 .env 파일 주입
# `rag-vector-db-generator` 폴더에서 chroma_db 생성해서 주입
# 이후 아래 절차 따라 진행

python -m venv .venv            # 가상 환경 생성

source venv/bin/activate        # 가상 환경 ON

pip install -r requirements.txt # 패키지 설치

fastapi dev app/main.py         # 서버 시작
```

## `/chat` 동작 방식 요약

- **/api/v1/chat으로 질문 시, history를 DDB(DynamoDB, AWS에서 제공하는 NoSQL 완전관리형 DB임)에서 SessionId를 Key로 불러옴**

  - SessionId는 문자열로 저장됨.
  - AWS console 들어가서 '상단 검색에 dynamodb 검색' -> 'DynamoDB 좌측 navigator에서 항목탐색' -> '스캔 실행해보면, table 안에 어떤거 들어가있는지 볼 수 있음'

- **질문을 바탕으로 retrieve_context를 chroma_db에서 유사도 분석으로 불러옴**

  - 이때, chroma_db 생성은 `rag-vector-db-generator` 폴더에서 관리됨.
  - `rag-vector-db-generator` 폴더에 변경이 감지되면, github actions에서 자동으로 chroma_db 폴더 만들고, S3로 올림.
  - 이후, `rag-server` 재배포하면 S3에 있는 chroma_db 불러와서 배포함.
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
- **Embeddings**: Upstage Solar Embeddings
- **Vector DB**: ChromaDB
- **RAG Framework**: LangChain

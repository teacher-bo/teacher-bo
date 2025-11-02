# RAG Server

## ⚠️ 필수 요구사항

- 테스트 목적으로 실행하지 말 것

## 목적

보드게임 규칙 전문가 챗봇 API - RAG 기반 질의응답 FastAPI 서버

## 기술 스택

- FastAPI, OpenAI GPT-4o-mini, Upstage Embeddings, ChromaDB, LangChain, AWS DynamoDB

## 폴더 구조

```
rag-server/
├── app/
│   ├── main.py              # FastAPI 앱 진입점
│   ├── config/              # 설정
│   │   ├── games.py         # 게임별 설정 (DB 경로, 컬렉션명)
│   │   └── prompts.py       # RAG 프롬프트 템플릿
│   ├── core/                # 핵심 로직
│   │   ├── vectorstore.py   # ChromaDB 로딩/캐싱
│   │   ├── chain.py         # RAG 체인 (검색 + LLM)
│   │   └── memory.py        # 세션별 대화 기록 관리 (DynamoDB)
│   ├── models/
│   │   └── schemas.py       # Pydantic 요청/응답 스키마
│   └── routers/
│       └── chat.py          # 채팅 API 엔드포인트
├── chroma_db/               # 벡터 데이터베이스 저장소
├── application.py           # Elastic Beanstalk 진입점
├── requirements.txt
└── .env                     # API 키 환경 변수
```

## 환경 변수

`.env` 파일에 다음 변수들을 설정해야 합니다:

```bash
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Upstage Embeddings
UPSTAGE_API_KEY=your_upstage_api_key

# LangChain (optional)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=your_langchain_api_key
LANGCHAIN_PROJECT=teacher-bo

# AWS DynamoDB for Chat History
DDB_AWS_ACCESS_KEY=your_aws_access_key
DDB_AWS_SECRET_ACCESS_KEY=your_aws_secret_key
DDB_AWS_REGION=ap-northeast-2
DDB_TABLE_FOR_RAG=teacher-bo-rag
```

## DynamoDB 테이블 설정

대화 기록 저장을 위한 DynamoDB 테이블이 필요합니다:

- **테이블 이름**: `teacher-bo-rag` (또는 `DDB_TABLE_FOR_RAG`에 설정한 값)
- **Partition Key**: `SessionId` (String)
- LangChain의 `DynamoDBChatMessageHistory`가 자동으로 테이블을 생성하므로, 수동 생성이 필요 없을 수 있습니다.

## 주요 API

- `POST /api/v1/chat` - 질문/답변
- `GET /api/v1/health` - 헬스체크
- `DELETE /api/v1/session/{session_id}` - 세션 삭제

## 실행

```bash
fastapi dev app/main.py
```

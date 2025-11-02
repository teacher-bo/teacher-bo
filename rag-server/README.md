# RAG Server - 보드게임 규칙 전문가 챗봇 API

## Quick Start

```bash
python -m venv .venv            # 가상 환경 생성

source venv/bin/activate        # 가상 환경 ON

pip install -r requirements.txt # 패키지 설치

fastapi dev app/main.py         # 서버 시작
```

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

## 🚀 시작하기

### 1. 패키지 설치

```bash
# 가상환경 활성화
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

### 2. 환경 변수 설정

`.env` 파일에 다음 API 키를 설정하세요:

```bash
OPENAI_API_KEY=your_openai_key_here
UPSTAGE_API_KEY=your_upstage_key_here

# 선택 (LangSmith 디버깅)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_key
LANGCHAIN_PROJECT=your_project_name
```

### 3. 서버 실행

```bash
# 개발 모드 (자동 재시작)
fastapi dev app/main.py

# 프로덕션 모드
fastapi run app/main.py
```

서버가 실행되면 다음 주소에서 확인할 수 있습니다:

- 서버: http://127.0.0.1:8000
- API 문서 (Swagger UI): http://127.0.0.1:8000/docs
- API 문서 (ReDoc): http://127.0.0.1:8000/redoc

## 📚 API 엔드포인트

### 1. 루트 엔드포인트

```bash
GET /
```

**응답 예시:**

```json
{
  "message": "보드게임 규칙 전문가 챗봇 API",
  "docs": "/docs",
  "health": "/api/v1/health"
}
```

### 2. 헬스체크

```bash
GET /api/v1/health
```

**응답 예시:**

```json
{
  "status": "ok",
  "available_games": ["sabotage"]
}
```

### 3. 질문-답변

```bash
POST /api/v1/chat
```

**요청 본문:**

```json
{
  "question": "게임 인원은 몇 명인가요?",
  "game_key": "sabotage",
  "session_id": "user123"
}
```

**응답 예시:**

```json
{
  "game_title": "사보타지",
  "answer_type": "OTHERS",
  "description": "3-9명이 플레이할 수 있습니다.",
  "source": "플레이어는 3-9명입니다.",
  "page": "2페이지",
  "session_id": "user123"
}
```

**파라미터 설명:**

- `question` (필수): 사용자 질문
- `game_key` (선택, 기본값: "sabotage"): 게임 식별자
- `session_id` (선택, 기본값: "default"): 세션 ID (대화 기록 유지)

**답변 유형 (answer_type):**

- `YES`: 긍정적 답변
- `NO`: 부정적 답변
- `OTHERS`: 설명이 필요한 답변 또는 정보 없음

### 4. 세션 삭제

```bash
DELETE /api/v1/session/{session_id}
```

**응답 예시:**

```json
{
  "message": "세션 'user123' 삭제됨"
}
```

## 🧪 테스트

### cURL을 사용한 테스트

```bash
# 1. 헬스체크
curl http://localhost:8000/api/v1/health

# 2. 질문하기
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "게임 시작은 어떻게 하나요?",
    "game_key": "sabotage",
    "session_id": "test_session"
  }'

# 3. 세션 삭제
curl -X DELETE http://localhost:8000/api/v1/session/test_session
```

### Python을 사용한 테스트

```python
import requests

# 질문하기
response = requests.post(
    "http://localhost:8000/api/v1/chat",
    json={
        "question": "카드는 몇 장인가요?",
        "game_key": "sabotage",
        "session_id": "my_session"
    }
)

print(response.json())
```

## 🎮 새 게임 추가하기

### 1. 게임 설정 추가 (`app/config/games.py`)

```python
AVAILABLE_GAMES: dict[str, GameConfig] = {
    "sabotage": {
        "name": "사보타지",
        "db_path": "./chroma_db/sabotage",
        "collection": "sabotage_rulebook"
    },
    "new_game": {
        "name": "새로운 게임",
        "db_path": "./chroma_db/new_game",
        "collection": "new_game_rulebook"
    },
}
```

### 2. 룰북 임베딩 및 저장

룰북 PDF를 벡터 데이터베이스에 저장하는 과정은 `example/documents/` 폴더의 스크립트를 참고하세요.

## 🔧 기술 스택

- **Framework**: FastAPI
- **LLM**: OpenAI GPT-4o-mini
- **Embeddings**: Upstage Solar Embeddings
- **Vector DB**: ChromaDB
- **RAG Framework**: LangChain

## ⚙️ 설정

### 벡터스토어 캐싱

벡터스토어는 게임별로 자동 캐싱되어 재로드를 방지합니다. 서버 재시작 시 캐시가 초기화됩니다.

### 세션 관리

세션별 대화 기록은 인메모리로 관리됩니다. 서버 재시작 시 모든 세션이 초기화됩니다.

### CORS 설정

기본적으로 모든 origin을 허용합니다. 프로덕션 환경에서는 `app/main.py`의 CORS 설정을 수정하여 특정 도메인만 허용하도록 변경하세요:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # 특정 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 📝 참고사항

- example/ 폴더에는 원본 CLI 버전의 코드가 보존되어 있습니다
- 최대한 기존 로직을 유지하며 API 레이어만 추가했습니다
- 프롬프트 템플릿은 `app/config/prompts.py`에서 수정 가능합니다

## 🐛 트러블슈팅

### ModuleNotFoundError: No module named 'app'

`app/__init__.py` 파일이 있는지 확인하세요.

### ChromaDB 관련 오류

`chroma_db/` 디렉토리가 존재하고 올바른 벡터 데이터가 저장되어 있는지 확인하세요.

### API 키 오류

`.env` 파일에 올바른 API 키가 설정되어 있는지 확인하세요.

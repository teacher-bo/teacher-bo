# DynamoDB Migration - Memory 모듈 변환 작업

## 작업 개요

**목적**: rag-server의 `/app/core/memory.py`를 인메모리 방식에서 AWS DynamoDB로 변환

**작업 일시**: 2025-11-02 17:06:19

## 현재 상태 분석

### 1. memory.py 현재 구조
- **파일**: `/app/core/memory.py`
- **기능**: 세션별 채팅 기록 관리 (인메모리 딕셔너리 사용)
- **주요 구성요소**:
  - `store: dict[str, ChatMessageHistory]` - 인메모리 저장소
  - `get_session_history(session_id: str)` - 세션 히스토리 조회/생성

### 2. memory 참조 파일 목록
1. **app/core/__init__.py**
   - `from .memory import get_session_history, store`
   - 모듈 수준에서 export

2. **app/routers/chat.py** (2곳)
   - Line 10: `from app.core.memory import get_session_history`
   - Line 44: `get_session_history`를 `create_rag_chain()`에 전달
   - Line 73: `from app.core.memory import store` (세션 삭제용)
   - Line 74-76: DELETE 엔드포인트에서 store 사용

3. **app/core/chain.py**
   - Line 15: `get_session_history_func` 파라미터로 받음
   - Line 68: `RunnableWithMessageHistory`에 전달

### 3. 현재 의존성
```
langchain>=0.1.0
langchain-community>=0.0.20
```
- `ChatMessageHistory`는 `langchain_community.chat_message_histories`에서 import
- `BaseChatMessageHistory`는 `langchain_core.chat_history`에서 import

## 작업 계획 (Step-by-Step)

### Step 1: DynamoDB 설계 및 설정
- [ ] DynamoDB 테이블 스키마 설계
  - Partition Key: `session_id` (String)
  - Sort Key: `timestamp` (Number) - 메시지 순서 보장
  - Attributes: `role` (String), `content` (String)
- [ ] boto3 의존성 추가 (`requirements.txt`)
- [ ] 환경변수 설정 (`.env`)
  - AWS_REGION
  - AWS_ACCESS_KEY_ID (optional, IAM Role 사용 권장)
  - AWS_SECRET_ACCESS_KEY (optional)
  - DYNAMODB_TABLE_NAME

### Step 2: DynamoDB Chat Message History 구현
- [ ] `app/core/memory.py` 수정
  - DynamoDB 기반 커스텀 `BaseChatMessageHistory` 구현
  - 또는 langchain의 `DynamoDBChatMessageHistory` 사용 검토
  - `get_session_history()` 함수를 DynamoDB 연동으로 변경
  - `store` 딕셔너리 제거 (DynamoDB로 대체)

### Step 3: 기존 인터페이스 호환성 유지
- [ ] `get_session_history(session_id: str) -> BaseChatMessageHistory` 시그니처 유지
- [ ] LangChain의 `RunnableWithMessageHistory`와 호환되는 구조 확인

### Step 4: 세션 삭제 API 수정
- [ ] `app/routers/chat.py`의 DELETE 엔드포인트 수정
  - `store` 딕셔너리 참조 제거
  - DynamoDB에서 세션 삭제하는 로직으로 변경

### Step 5: Export 및 Import 경로 정리
- [ ] `app/core/__init__.py` 수정
  - `store` export 제거 (더 이상 필요 없음)
  - 필요시 새로운 함수 export (예: `delete_session_history`)

### Step 6: 테스트 및 검증
- [ ] 로컬 환경에서 DynamoDB Local로 테스트
- [ ] 기존 API 동작 검증
  - POST /api/v1/chat - 대화 기록 저장/조회
  - DELETE /api/v1/session/{session_id} - 세션 삭제
- [ ] 에러 핸들링 확인 (DynamoDB 연결 실패 등)

### Step 7: 문서화
- [ ] `.ai/01-rag-server.md` 업데이트
  - 기술 스택에 AWS DynamoDB 추가
  - 환경변수 설명 추가
  - 배포 시 DynamoDB 테이블 생성 가이드 추가

## 주요 고려사항

### 1. LangChain DynamoDB 지원
- `langchain-community`에 `DynamoDBChatMessageHistory` 제공 확인 필요
- 없으면 커스텀 구현 필요

### 2. 비용 및 성능
- DynamoDB 읽기/쓰기 용량 설정 (On-Demand vs Provisioned)
- 세션 데이터 TTL 설정 고려

### 3. 에러 처리
- DynamoDB 연결 실패 시 fallback 전략
- 네트워크 타임아웃 처리

### 4. 보안
- IAM Role 기반 인증 권장 (AWS Elastic Beanstalk 환경)
- 환경변수로 credential 관리 시 주의

## 예상 변경 파일 목록

1. `/Users/shindongjun/Desktop/repo/teacher-bo/rag-server/requirements.txt`
2. `/Users/shindongjun/Desktop/repo/teacher-bo/rag-server/.env`
3. `/Users/shindongjun/Desktop/repo/teacher-bo/rag-server/app/core/memory.py`
4. `/Users/shindongjun/Desktop/repo/teacher-bo/rag-server/app/core/__init__.py`
5. `/Users/shindongjun/Desktop/repo/teacher-bo/rag-server/app/routers/chat.py`
6. `/Users/shindongjun/Desktop/repo/teacher-bo/.ai/01-rag-server.md`

## 다음 단계

사용자의 승인을 받은 후 Step 1부터 순차적으로 진행합니다.

---

## 작업 진행 상황

### ✅ Step 1: DynamoDB 설계 및 설정 (완료)
- [x] boto3 의존성 추가 (`requirements.txt`)
- [x] 환경변수 확인 (`.env`에 이미 존재)
  - DDB_AWS_ACCESS_KEY
  - DDB_AWS_SECRET_ACCESS_KEY
  - DDB_AWS_REGION
  - DDB_TABLE_FOR_RAG

### ✅ Step 2: DynamoDB Chat Message History 구현 (완료)
- [x] `app/core/memory.py` 수정
  - LangChain의 `DynamoDBChatMessageHistory` 사용
  - `get_session_history()` 함수를 DynamoDB 연동으로 변경
  - `store` 딕셔너리 제거
  - `delete_session_history()` 함수 추가

### ✅ Step 3: 기존 인터페이스 호환성 유지 (완료)
- [x] `get_session_history(session_id: str) -> BaseChatMessageHistory` 시그니처 유지
- [x] LangChain의 `RunnableWithMessageHistory`와 호환

### ✅ Step 4: 세션 삭제 API 수정 (완료)
- [x] `app/routers/chat.py`의 DELETE 엔드포인트 수정
  - `store` 딕셔너리 참조 제거
  - `delete_session_history()` 함수 사용

### ✅ Step 5: Export 및 Import 경로 정리 (완료)
- [x] `app/core/__init__.py` 수정
  - `store` export 제거
  - `delete_session_history` export 추가

### ✅ Step 7: 문서화 (완료)
- [x] `.ai/01-rag-server.md` 업데이트
  - 기술 스택에 AWS DynamoDB 추가
  - 환경변수 설명 추가
  - DynamoDB 테이블 설정 가이드 추가

## 변경된 파일 목록

1. ✅ `/Users/shindongjun/Desktop/repo/teacher-bo/rag-server/requirements.txt`
   - boto3>=1.28.0 추가

2. ✅ `/Users/shindongjun/Desktop/repo/teacher-bo/rag-server/app/core/memory.py`
   - DynamoDB 기반으로 전면 재작성
   - `DynamoDBChatMessageHistory` 사용
   - `delete_session_history()` 함수 추가

3. ✅ `/Users/shindongjun/Desktop/repo/teacher-bo/rag-server/app/core/__init__.py`
   - `store` 제거, `delete_session_history` 추가

4. ✅ `/Users/shindongjun/Desktop/repo/teacher-bo/rag-server/app/routers/chat.py`
   - `delete_session_history` import
   - DELETE 엔드포인트에서 `delete_session_history()` 사용

5. ✅ `/Users/shindongjun/Desktop/repo/teacher-bo/.ai/01-rag-server.md`
   - DynamoDB 관련 설명 추가
   - 환경변수 섹션 추가

## 다음 단계

Step 6: 테스트 및 검증이 남아 있습니다.
- boto3 설치: `pip install boto3>=1.28.0`
- DynamoDB 연결 테스트
- API 동작 검증

---

## 🐛 이슈 해결: DynamoDB 스키마 불일치

### 문제
- 에러: `ValidationException: The provided key element does not match the schema`
- 원인: DynamoDB 테이블의 파티션 키가 `session_id`인데, LangChain의 `DynamoDBChatMessageHistory`는 기본적으로 `SessionId`를 사용

### 해결 방법
- DynamoDB 테이블의 파티션 키를 `session_id` → `SessionId`로 변경
- LangChain의 기본값: `primary_key_name = SessionId`

### DynamoDB 테이블 스키마 (변경 후)
- **Partition Key**: `SessionId` (String) ← 대문자 S
- **Attributes**: LangChain이 자동으로 `History` 필드 사용


### DynamoDB 테이블 생성 가이드

AWS Console 또는 CLI로 테이블 생성 시:

**테이블 정보:**
- Table name: `teacher-bo-rag`
- Partition key: `SessionId` (Type: **String**)
- Sort key: 없음
- Read/write capacity: On-demand 권장

**CLI 명령어 예시:**
```bash
aws dynamodb create-table \
    --table-name teacher-bo-rag \
    --attribute-definitions AttributeName=SessionId,AttributeType=S \
    --key-schema AttributeName=SessionId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region ap-northeast-2
```

**LangChain이 자동으로 사용하는 필드:**
- `SessionId` (String) - 파티션 키, 세션 식별자
- `History` - 메시지 히스토리 저장 (LangChain이 자동 관리)
- `expireAt` - TTL 설정 시 사용 (옵션)


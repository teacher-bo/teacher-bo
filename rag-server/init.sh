#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== RAG Server 초기화 스크립트 ==="
echo ""

# 0. Check Python 3.12 or higher
echo "[1/9] Python 버전 확인 중..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3가 설치되어 있지 않습니다.${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 12 ]); then
    echo -e "${RED}❌ Python 3.12 이상이 필요합니다. 현재 버전: $PYTHON_VERSION${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python $PYTHON_VERSION 확인 완료${NC}"
echo ""

# 1. Setup virtual environment
echo "[2/9] 가상 환경 확인 중..."
RAG_SERVER_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -d "$RAG_SERVER_DIR/venv" ]; then
    echo -e "${YELLOW}⚠ 가상 환경이 없습니다. 생성 중...${NC}"
    python3 -m venv "$RAG_SERVER_DIR/venv"
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 가상 환경 생성 실패${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ 가상 환경 생성 완료${NC}"
else
    echo -e "${GREEN}✓ 가상 환경이 이미 존재합니다.${NC}"
fi

echo "가상 환경 활성화 중..."
source "$RAG_SERVER_DIR/venv/bin/activate"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 가상 환경 활성화 실패${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 가상 환경 활성화 완료${NC}"
echo ""

# 2. Check rag-server .env file
echo "[3/9] rag-server .env 파일 확인 중..."
if [ ! -f "$RAG_SERVER_DIR/.env" ]; then
    echo -e "${RED}❌ .env 파일이 존재하지 않습니다.${NC}"
    echo -e "${YELLOW}다음 단계를 수행해주세요:${NC}"
    echo "1. $RAG_SERVER_DIR/.env 파일을 생성하세요"
    echo "2. 필요한 환경 변수를 주입하세요"
    echo "3. 다시 이 스크립트를 실행하세요"
    exit 1
fi
echo -e "${GREEN}✓ .env 파일 확인 완료${NC}"
echo ""

# 3. Check chroma_db folder
echo "[4/9] chroma_db 폴더 확인 중..."
if [ -d "$RAG_SERVER_DIR/chroma_db" ]; then
    echo -e "${GREEN}✓ chroma_db 폴더가 이미 존재합니다.${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠ chroma_db 폴더가 없습니다. 생성을 시작합니다...${NC}"
    echo ""
    
    # 4. Check rag-vector-db-generator .env
    echo "[5/9] rag-vector-db-generator .env 파일 확인 중..."
    VECTOR_DB_DIR="$RAG_SERVER_DIR/../rag-vector-db-generator"

    # Extract API keys from rag-server .env (do not echo secrets)
    UPSTAGE_API_KEY=$(grep "^UPSTAGE_API_KEY=" "$RAG_SERVER_DIR/.env" | cut -d'=' -f2-)
    OPENAI_API_KEY=$(grep "^OPENAI_API_KEY=" "$RAG_SERVER_DIR/.env" | cut -d'=' -f2-)

    if [ ! -f "$VECTOR_DB_DIR/.env" ]; then
        echo -e "${YELLOW}⚠ rag-vector-db-generator .env 파일이 없습니다. 생성 중...${NC}"

        # UPSTAGE_API_KEY is required for OCR flow
        if [ -z "$UPSTAGE_API_KEY" ]; then
            echo -e "${RED}❌ rag-server .env에서 UPSTAGE_API_KEY를 찾을 수 없습니다.${NC}"
            exit 1
        fi

        # Create new .env with required/optional keys
        {
            echo "UPSTAGE_API_KEY=$UPSTAGE_API_KEY"
            if [ -n "$OPENAI_API_KEY" ]; then
                echo "OPENAI_API_KEY=$OPENAI_API_KEY"
            else
                echo -e "${YELLOW}⚠ rag-server .env에서 OPENAI_API_KEY를 찾을 수 없습니다. (선택)${NC}" 1>&2
            fi
        } > "$VECTOR_DB_DIR/.env"

        echo -e "${GREEN}✓ rag-vector-db-generator .env 파일 생성 완료${NC}"
    else
        echo -e "${GREEN}✓ rag-vector-db-generator .env 파일 확인 완료${NC}"
        # Ensure required/optional keys exist in existing .env
        if ! grep -q "^UPSTAGE_API_KEY=" "$VECTOR_DB_DIR/.env"; then
            if [ -n "$UPSTAGE_API_KEY" ]; then
                echo "UPSTAGE_API_KEY=$UPSTAGE_API_KEY" >> "$VECTOR_DB_DIR/.env"
                echo -e "${GREEN}✓ UPSTAGE_API_KEY 추가 완료${NC}"
            else
                echo -e "${RED}❌ rag-server .env에서 UPSTAGE_API_KEY를 찾을 수 없습니다.${NC}"
                exit 1
            fi
        fi

        if ! grep -q "^OPENAI_API_KEY=" "$VECTOR_DB_DIR/.env"; then
            if [ -n "$OPENAI_API_KEY" ]; then
                echo "OPENAI_API_KEY=$OPENAI_API_KEY" >> "$VECTOR_DB_DIR/.env"
                echo -e "${GREEN}✓ OPENAI_API_KEY 추가 완료${NC}"
            else
                echo -e "${YELLOW}⚠ rag-server .env에서 OPENAI_API_KEY를 찾을 수 없습니다. (선택)${NC}"
            fi
        fi
    fi
    echo ""
    
    # 5. Install requirements for rag-vector-db-generator
    echo "[6/9] rag-vector-db-generator 의존성 설치 중..."
    cd "$VECTOR_DB_DIR"
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 의존성 설치 실패${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ 의존성 설치 완료${NC}"
    echo ""
    
    # 6. Generate chroma_db and copy to rag-server
    echo "[7/9] chroma_db 생성 중..."
    python3 embed_and_store.py
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ chroma_db 생성 실패${NC}"
        exit 1
    fi
    
    if [ ! -d "$VECTOR_DB_DIR/chroma_db" ]; then
        echo -e "${RED}❌ chroma_db 폴더가 생성되지 않았습니다.${NC}"
        exit 1
    fi
    
    echo "chroma_db를 rag-server로 복사 중..."
    cp -r "$VECTOR_DB_DIR/chroma_db" "$RAG_SERVER_DIR/"
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ chroma_db 복사 실패${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ chroma_db 생성 및 복사 완료${NC}"
    echo ""
fi

# 7. Verify chroma_db in rag-server
echo "[8/9] rag-server의 chroma_db 최종 확인 중..."
cd "$RAG_SERVER_DIR"
if [ ! -d "$RAG_SERVER_DIR/chroma_db" ]; then
    echo -e "${RED}❌ chroma_db 폴더가 rag-server에 없습니다.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ chroma_db 확인 완료${NC}"
echo ""

# 8. Install requirements for rag-server
echo "[9/9] rag-server 의존성 설치 중..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 의존성 설치 실패${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 의존성 설치 완료${NC}"
echo ""

# 8. Final message
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 초기화가 완료되었습니다!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}가상 환경을 '실행'하려면 다음 명령어를 실행하세요:${NC}"
echo -e "${GREEN}source venv/bin/activate${NC}"
echo ""
echo -e "${YELLOW}다음 명령어로 서버를 시작하세요:${NC}"
echo -e "${GREEN}fastapi dev app/main.py${NC}"
echo ""
echo -e "${YELLOW}⚠ 가상 환경을 '해제'하려면 다음 명령어를 실행하세요:${NC}"
echo -e "${GREEN}deactivate${NC}"
echo ""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import chat

load_dotenv()

app = FastAPI(
    title="보드게임 규칙 전문가 챗봇 API",
    description="RAG 기반 보드게임 룰북 질의응답 서비스",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api/v1", tags=["Chat"])


@app.get("/")
async def root():
    return {
        "message": "보드게임 규칙 전문가 챗봇 API",
        "docs": "/docs",
        "health": "/api/v1/health"
    }

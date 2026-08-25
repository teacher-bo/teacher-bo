"""Chat API router."""

import traceback

from fastapi import APIRouter, HTTPException
from langchain_core.runnables.history import RunnableWithMessageHistory

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    HealthCheckResponse,
    OutputStructure,
)
from app.config.games import AVAILABLE_GAMES
from app.config.prompts import PromptTemplate
from app.core.vectorstore import load_vectorstore
from app.core.chain import (
    ask_question,
    create_rag_chain,
    get_llm_model,
    get_reasoning_effort,
    is_reasoning_model,
)
from app.core.memory import get_session_history, delete_session_history

router = APIRouter()

_chain_cache: dict[str, tuple[RunnableWithMessageHistory, str]] = {}


def get_or_create_chain(game_key: str) -> tuple[RunnableWithMessageHistory, str]:
    """게임별 RAG 체인 캐싱 (벡터스토어 로드와 LLM 초기화를 1회로 제한)"""
    if game_key not in _chain_cache:
        vectorstore, game_title = load_vectorstore(game_key, AVAILABLE_GAMES)
        chain_with_history = create_rag_chain(
            vectorstore,
            OutputStructure,
            PromptTemplate,
            get_session_history
        )
        _chain_cache[game_key] = (chain_with_history, game_title)

    return _chain_cache[game_key]


@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """헬스체크 엔드포인트"""
    model_name = get_llm_model()

    return {
        "status": "ok",
        "available_games": list(AVAILABLE_GAMES.keys()),
        "llm_model": model_name,
        "reasoning_effort": (
            get_reasoning_effort() if is_reasoning_model(model_name) else None
        ),
    }


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """보드게임 규칙 질문-답변 엔드포인트"""
    if request.game_key not in AVAILABLE_GAMES:
        raise HTTPException(
            status_code=404,
            detail=f"게임을 찾을 수 없습니다: {request.game_key}"
        )

    try:
        chain_with_history, game_title = get_or_create_chain(request.game_key)

        answer = ask_question(
            chain_with_history,
            OutputStructure,
            request.question,
            game_title,
            request.session_id
        )

        return ChatResponse(
            game_title=game_title,
            answer_type=answer.answer_type,
            description=answer.description,
            source=answer.source,
            page=answer.page,
            session_id=request.session_id
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")


@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """특정 세션의 대화 기록 삭제"""
    success = delete_session_history(session_id)
    if success:
        return {"message": f"세션 '{session_id}' 삭제됨"}
    return {"message": f"세션 '{session_id}' 삭제 실패 또는 존재하지 않음"}

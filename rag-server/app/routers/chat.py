"""Chat API router."""

from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatRequest, ChatResponse, HealthCheckResponse
from app.config.games import AVAILABLE_GAMES
from app.config.prompts import PromptTemplate
from app.models.schemas import OutputStructure
from app.core.vectorstore import load_vectorstore
from app.core.chain import create_rag_chain, ask_question
from app.core.memory import get_session_history, delete_session_history

router = APIRouter()

_vectorstore_cache = {}


def get_or_load_vectorstore(game_key: str):
    """벡터스토어 캐싱"""
    if game_key not in _vectorstore_cache:
        vectorstore, game_title = load_vectorstore(game_key, AVAILABLE_GAMES)
        _vectorstore_cache[game_key] = (vectorstore, game_title)
    return _vectorstore_cache[game_key]


@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """헬스체크 엔드포인트"""
    return {
        "status": "ok",
        "available_games": list(AVAILABLE_GAMES.keys())
    }


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """보드게임 규칙 질문-답변 엔드포인트"""
    try:
        vectorstore, game_title = get_or_load_vectorstore(request.game_key)
        
        chain_with_history, parser = create_rag_chain(
            vectorstore,
            OutputStructure,
            PromptTemplate,
            get_session_history
        )
        
        response = ask_question(
            chain_with_history,
            parser,
            request.question,
            game_title,
            request.session_id
        )
        
        return ChatResponse(
            game_title=game_title,
            answer_type=response.get("answer_type", "OTHERS"),
            description=response.get("description", ""),
            source=response.get("source", ""),
            page=response.get("page"),
            session_id=request.session_id
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")


@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """특정 세션의 대화 기록 삭제"""
    success = delete_session_history(session_id)
    if success:
        return {"message": f"세션 '{session_id}' 삭제됨"}
    return {"message": f"세션 '{session_id}' 삭제 실패 또는 존재하지 않음"}

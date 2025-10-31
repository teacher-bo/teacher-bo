"""Chat message history management."""

from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory


# 세션별 채팅 기록 저장소
store: dict[str, ChatMessageHistory] = {}


def get_session_history(session_id: str) -> BaseChatMessageHistory:
    """
    세션 ID별로 채팅 기록을 관리
    
    Args:
        session_id: 세션 식별자
        
    Returns:
        BaseChatMessageHistory: 해당 세션의 채팅 기록
    """
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

"""Pydantic models for structured outputs."""

from typing import Literal

from pydantic import BaseModel, Field

AnswerType = Literal["YES", "NO", "EXPLAIN", "CANNOT_ANSWER"]


class OutputStructure(BaseModel):
    """RAG 챗봇의 출력 구조"""
    answer_type: AnswerType = Field(description="답변 유형")
    description: str = Field(description="질문에 대한 간결하고 명확한 설명")
    source: str = Field(description="답변 근거가 된 룰북의 실제 문장 (원문 그대로 인용)")
    page: int|None = Field(description="룰북 페이지 값 (예: 5 또는 null)")


class ChatRequest(BaseModel):
    """채팅 요청 스키마"""
    question: str = Field(..., description="사용자 질문")
    game_key: str = Field(default="sabotage", description="게임 식별자")
    session_id: str = Field(default="default", description="세션 ID")


class ChatResponse(BaseModel):
    """채팅 응답 스키마"""
    game_title: str = Field(..., description="게임 이름")
    answer_type: AnswerType = Field(..., description="답변 유형 (YES/NO/EXPLAIN/CANNOT_ANSWER)")
    description: str = Field(..., description="답변 설명")
    source: str = Field(..., description="출처 (룰북 원문)")
    page: int|None = Field(..., description="룰북 페이지 값 (예: 5 또는 null)")
    session_id: str = Field(..., description="세션 ID")


class HealthCheckResponse(BaseModel):
    """헬스체크 응답"""
    status: str
    available_games: list[str]
    llm_model: str = Field(..., description="현재 사용 중인 LLM 모델명")
    reasoning_effort: str | None = Field(
        None, description="reasoning 모델일 때의 추론 강도"
    )
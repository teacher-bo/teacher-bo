"""RAG chain construction."""

import os
from typing import Callable, Protocol, TypeVar

from langchain_chroma import Chroma
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

DEFAULT_LLM_MODEL = "gpt-5.6-luna"
DEFAULT_REASONING_EFFORT = "none"
DEFAULT_TEMPERATURE = 0.3
DEFAULT_RETRIEVE_K = 5

REASONING_MODEL_PREFIXES = ("gpt-5", "o1", "o3", "o4")
NON_REASONING_MODEL_MARKERS = ("-chat",)
VALID_REASONING_EFFORTS = frozenset(
    {"none", "minimal", "low", "medium", "high", "xhigh", "max"}
)

T = TypeVar("T", bound=BaseModel)


class StructuredOutputError(RuntimeError):
    """LLM이 요청한 스키마에 맞는 응답을 반환하지 못한 경우"""


class PromptTemplateProtocol(Protocol):
    system_template: str
    user_template: str


def _get_env(name: str, default: str) -> str:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip() or default


def get_llm_model() -> str:
    """사용할 LLM 모델명 (RAG_LLM_MODEL로 override 가능)"""
    return _get_env("RAG_LLM_MODEL", DEFAULT_LLM_MODEL)


def is_reasoning_model(model_name: str) -> bool:
    """
    reasoning 계열 모델 여부 (temperature 미지원, reasoning_effort 사용)

    `gpt-5-chat-latest`처럼 gpt-5 접두사를 쓰지만 reasoning이 아닌 모델은 제외한다.
    """
    if any(marker in model_name for marker in NON_REASONING_MODEL_MARKERS):
        return False

    return model_name.startswith(REASONING_MODEL_PREFIXES)


def get_reasoning_effort() -> str:
    """reasoning 모델의 추론 강도 (RAG_REASONING_EFFORT)"""
    effort = _get_env("RAG_REASONING_EFFORT", DEFAULT_REASONING_EFFORT)
    if effort not in VALID_REASONING_EFFORTS:
        raise ValueError(
            "RAG_REASONING_EFFORT must be one of "
            f"{sorted(VALID_REASONING_EFFORTS)}, got {effort!r}"
        )
    return effort


def get_temperature() -> float:
    """비 reasoning 모델의 temperature (RAG_LLM_TEMPERATURE)"""
    raw = _get_env("RAG_LLM_TEMPERATURE", str(DEFAULT_TEMPERATURE))
    try:
        temperature = float(raw)
    except ValueError as exc:
        raise ValueError("RAG_LLM_TEMPERATURE must be a float") from exc

    if not 0.0 <= temperature <= 2.0:
        raise ValueError("RAG_LLM_TEMPERATURE must be between 0.0 and 2.0")

    return temperature


def get_retrieve_k() -> int:
    """유사도 검색으로 가져올 문서 개수 (RAG_RETRIEVE_K)"""
    raw = _get_env("RAG_RETRIEVE_K", str(DEFAULT_RETRIEVE_K))
    try:
        retrieve_k = int(raw)
    except ValueError as exc:
        raise ValueError("RAG_RETRIEVE_K must be an integer") from exc

    if retrieve_k <= 0:
        raise ValueError("RAG_RETRIEVE_K must be greater than 0")

    return retrieve_k


def build_llm() -> ChatOpenAI:
    """
    환경변수 기반으로 LLM 인스턴스 생성

    reasoning 계열(gpt-5.x, o-series)은 temperature를 지원하지 않으므로
    reasoning_effort만 전달하고, 그 외 모델은 temperature만 전달한다.
    """
    model_name = get_llm_model()

    if is_reasoning_model(model_name):
        return ChatOpenAI(
            model=model_name,
            reasoning_effort=get_reasoning_effort(),
        )

    return ChatOpenAI(
        model=model_name,
        temperature=get_temperature(),
    )


def validate_llm_config() -> None:
    """
    앱 기동 시점에 LLM 관련 환경변수를 검증한다.

    Raises:
        ValueError: 잘못된 값이 설정된 경우
    """
    if is_reasoning_model(get_llm_model()):
        get_reasoning_effort()
    else:
        get_temperature()

    get_retrieve_k()


def create_rag_chain(
    vectorstore: Chroma,
    output_structure: type[BaseModel],
    prompt_template_class: type[PromptTemplateProtocol],
    get_session_history_func: Callable[[str], BaseChatMessageHistory],
) -> RunnableWithMessageHistory:
    """
    RAG 체인 생성

    Args:
        vectorstore: ChromaDB 벡터스토어
        output_structure: Pydantic 출력 스키마 클래스
        prompt_template_class: 프롬프트 템플릿 클래스
        get_session_history_func: 세션 히스토리 관리 함수

    Returns:
        RunnableWithMessageHistory: 대화 기록을 포함한 RAG 체인.
            invoke 결과는 {"raw": AIMessage, "parsed": output_structure,
            "parsing_error": Exception | None} 형태이다.
    """
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", prompt_template_class.system_template),
        MessagesPlaceholder(variable_name="chat_history"),
        ("user", prompt_template_class.user_template),
    ])

    model = build_llm().with_structured_output(
        output_structure,
        method="json_schema",
        include_raw=True,
    )

    retrieve_k = get_retrieve_k()

    def retrieve_context(inputs: dict) -> str:
        """질문과 관련된 문서를 검색하여 컨텍스트로 반환"""
        question = inputs["question"]
        docs = vectorstore.similarity_search(question, k=retrieve_k)

        context_parts = []
        for doc in docs:
            meta = doc.metadata
            doc_type = meta.get('type', 'unknown')
            section = meta.get('section_title', 'N/A')
            page = meta.get('page', 'N/A')
            source_content = meta.get('content', 'N/A')

            source_info = f"[Type: {doc_type}, Section: {section}, Page: {page}, Source: {source_content}]"

            content = f"{source_info}\n{doc.page_content}"
            context_parts.append(content)

        return "\n\n---\n\n".join(context_parts)

    chain = (
        RunnablePassthrough.assign(context=retrieve_context)
        | prompt_template
        | model
    )

    return RunnableWithMessageHistory(
        chain,
        get_session_history_func,
        input_messages_key="question",
        history_messages_key="chat_history",
        output_messages_key="raw",
    )


def ask_question(
    chain_with_history: RunnableWithMessageHistory,
    output_structure: type[T],
    question: str,
    game_title: str,
    session_id: str = "default"
) -> T:
    """
    질문하고 구조화된 응답 받기

    Args:
        chain_with_history: 대화 기록이 포함된 RAG 체인
        output_structure: Pydantic 출력 스키마 클래스
        question: 사용자 질문
        game_title: 게임 타이틀
        session_id: 세션 식별자 (기본값: "default")

    Returns:
        output_structure 인스턴스

    Raises:
        StructuredOutputError: LLM 응답이 스키마와 일치하지 않는 경우
    """
    result = chain_with_history.invoke(
        {"question": question, "game_title": game_title},
        config={"configurable": {"session_id": session_id}}
    )

    parsing_error = result.get("parsing_error")
    if parsing_error is not None:
        raise StructuredOutputError(f"LLM 응답 파싱 실패: {parsing_error}")

    parsed = result.get("parsed")
    if not isinstance(parsed, output_structure):
        raise StructuredOutputError(
            f"LLM 응답이 {output_structure.__name__} 스키마와 일치하지 않습니다"
        )

    return parsed

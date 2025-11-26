"""RAG chain construction."""

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_chroma import Chroma


def create_rag_chain(
    vectorstore: Chroma,
    output_structure,
    prompt_template_class,
    get_session_history_func
):
    """
    RAG 체인 생성
    
    Args:
        vectorstore: ChromaDB 벡터스토어
        output_structure: Pydantic 출력 스키마 클래스
        prompt_template_class: 프롬프트 템플릿 클래스
        get_session_history_func: 세션 히스토리 관리 함수
        
    Returns:
        tuple: (chain_with_history, parser)
            - chain_with_history: 대화 기록을 포함한 RAG 체인
            - parser: JSON 출력 파서
    """
    # Parser 설정
    parser = JsonOutputParser(pydantic_object=output_structure)
    
    # 프롬프트 템플릿 구성
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", prompt_template_class.system_template),
        MessagesPlaceholder(variable_name="chat_history"),
        ("user", prompt_template_class.user_template),
    ])
    
    # format_instructions는 고정
    prompt_template = prompt_template.partial(
        format_instructions=parser.get_format_instructions()
    )
    
    # LLM 설정
    model = ChatOpenAI(
        temperature=0.3,
        model_name="gpt-4o-mini",
    )
    
    # 질문 재구성 프롬프트 (대명사/생략된 맥락 해결)
    contextualize_q_prompt = ChatPromptTemplate.from_messages([
        ("system", """Given a chat history and the latest user question which might reference context in the chat history,
formulate a standalone question which can be understood without the chat history.
Do NOT answer the question, just reformulate it if needed and otherwise return it as is.
Always respond in Korean."""),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ])
    
    # 질문 재구성 체인
    contextualize_q_chain = contextualize_q_prompt | model | StrOutputParser()
    
    def get_search_query(inputs):
        """대화 기록이 있으면 질문을 재구성, 없으면 원본 질문 반환"""
        chat_history = inputs.get("chat_history", [])
        question = inputs["question"]
        
        if chat_history:
            # 대화 기록이 있으면 질문 재구성
            reformulated = contextualize_q_chain.invoke({
                "chat_history": chat_history,
                "question": question
            })
            print(f"[DEBUG] Original: '{question}' -> Reformulated: '{reformulated}'")
            return reformulated
        return question
    
    def retrieve_context(inputs):
        """질문과 관련된 문서를 검색하여 컨텍스트로 반환"""
        # 재구성된 질문으로 검색
        search_query = get_search_query(inputs)
        docs = vectorstore.similarity_search(search_query, k=5)
        
        # 메타데이터를 포함하여 컨텍스트 구성
        context_parts = []
        for doc in docs:
            meta = doc.metadata
            doc_type = meta.get('type', 'unknown')
            section = meta.get('section_title', 'N/A')
            page = meta.get('page', 'N/A')
            source_content = meta.get('content', 'N/A')
            
            # 공통: type, section, page, 출처(content) 모두 포함
            source_info = f"[Type: {doc_type}, Section: {section}, Page: {page}, Source: {source_content}]"
            
            content = f"{source_info}\n{doc.page_content}"
            context_parts.append(content)
            
        return "\n\n---\n\n".join(context_parts)
    
    # 체인 구성: 컨텍스트 검색 → 프롬프트 → LLM
    chain_without_parser = (
        RunnablePassthrough.assign(context=retrieve_context)
        | prompt_template 
        | model
    )
    
    # 대화 기록을 포함한 체인
    chain_with_history = RunnableWithMessageHistory(
        chain_without_parser,
        get_session_history_func,
        input_messages_key="question",
        history_messages_key="chat_history",
    )
    
    return chain_with_history, parser


def ask_question(
    chain_with_history,
    parser: JsonOutputParser,
    question: str,
    game_title: str,
    session_id: str = "default"
) -> dict:
    """
    질문하고 구조화된 응답 받기
    
    Args:
        chain_with_history: 대화 기록이 포함된 RAG 체인
        parser: JSON 출력 파서
        question: 사용자 질문
        game_title: 게임 타이틀
        session_id: 세션 식별자 (기본값: "default")
        
    Returns:
        dict: 구조화된 JSON 응답
    """
    ai_message = chain_with_history.invoke(
        {"question": question, "game_title": game_title},
        config={"configurable": {"session_id": session_id}}
    )
    
    return parser.parse(ai_message.content)

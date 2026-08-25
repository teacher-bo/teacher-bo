import unittest
from unittest.mock import patch

from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.documents import Document
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableLambda

from app.config.prompts import PromptTemplate
from app.core.chain import (
    StructuredOutputError,
    ask_question,
    create_rag_chain,
)
from app.models.schemas import OutputStructure

ANSWER = OutputStructure(
    answer_type="YES",
    description="가능합니다.",
    source="첫 등록을 하고 난 다음 자신의 차례부터 이용할 수 있다.",
    page=1,
)
RAW = AIMessage(content='{"answer_type":"YES"}')


class FakeVectorStore:
    def __init__(self, docs: list[Document]) -> None:
        self.docs = docs
        self.calls: list[tuple[str, int]] = []

    def similarity_search(self, query: str, k: int) -> list[Document]:
        self.calls.append((query, k))
        return self.docs[:k]


class FakeStructuredModel:
    def __init__(self) -> None:
        self.prompts: list[str] = []

    def __call__(self, prompt_value):
        self.prompts.append(prompt_value.to_string())
        return {"raw": RAW, "parsed": ANSWER, "parsing_error": None}


class FakeLLM:
    def __init__(self, structured: FakeStructuredModel) -> None:
        self.structured = structured
        self.structured_output_kwargs: dict | None = None

    def with_structured_output(self, schema, method: str, include_raw: bool):
        self.structured_output_kwargs = {
            "schema": schema,
            "method": method,
            "include_raw": include_raw,
        }
        return RunnableLambda(self.structured)


def make_docs(count: int) -> list[Document]:
    return [
        Document(
            page_content=f"본문 {index}",
            metadata={
                "type": "rulebook",
                "section_title": f"섹션 {index}",
                "page": index,
                "content": f"원문 {index}",
            },
        )
        for index in range(1, count + 1)
    ]


class CreateRagChainTest(unittest.TestCase):
    def _build(self, retrieve_k: str = "3", doc_count: int = 5):
        vectorstore = FakeVectorStore(make_docs(doc_count))
        structured = FakeStructuredModel()
        llm = FakeLLM(structured)
        store: dict[str, InMemoryChatMessageHistory] = {}

        def get_history(session_id: str) -> InMemoryChatMessageHistory:
            return store.setdefault(session_id, InMemoryChatMessageHistory())

        with patch.dict("os.environ", {"RAG_RETRIEVE_K": retrieve_k}), \
                patch("app.core.chain.build_llm", return_value=llm):
            chain = create_rag_chain(
                vectorstore, OutputStructure, PromptTemplate, get_history
            )

        return chain, vectorstore, structured, llm, store

    def test_uses_strict_json_schema_structured_output(self):
        _, _, _, llm, _ = self._build()

        self.assertEqual(
            llm.structured_output_kwargs,
            {
                "schema": OutputStructure,
                "method": "json_schema",
                "include_raw": True,
            },
        )

    def test_retrieve_k_is_read_from_env(self):
        chain, vectorstore, _, _, _ = self._build(retrieve_k="3")

        chain.invoke(
            {"question": "타일 몇 개?", "game_title": "루미큐브"},
            config={"configurable": {"session_id": "s1"}},
        )

        self.assertEqual(vectorstore.calls, [("타일 몇 개?", 3)])

    def test_prompt_has_no_format_instructions_placeholder(self):
        chain, _, structured, _, _ = self._build()

        chain.invoke(
            {"question": "타일 몇 개?", "game_title": "루미큐브"},
            config={"configurable": {"session_id": "s1"}},
        )

        rendered = structured.prompts[0]
        self.assertNotIn("format_instructions", rendered)
        self.assertIn("루미큐브", rendered)
        self.assertIn("원문 1", rendered)

    def test_history_stores_raw_ai_message(self):
        chain, _, _, _, store = self._build()

        for question in ("첫 질문", "두 번째 질문"):
            chain.invoke(
                {"question": question, "game_title": "루미큐브"},
                config={"configurable": {"session_id": "s1"}},
            )

        messages = store["s1"].messages
        self.assertEqual(
            [type(message).__name__ for message in messages],
            ["HumanMessage", "AIMessage", "HumanMessage", "AIMessage"],
        )
        self.assertEqual(messages[1].content, RAW.content)


class FakeChain:
    def __init__(self, result: dict) -> None:
        self.result = result
        self.calls: list[tuple[dict, dict]] = []

    def invoke(self, inputs: dict, config: dict) -> dict:
        self.calls.append((inputs, config))
        return self.result


class AskQuestionTest(unittest.TestCase):
    def test_returns_parsed_model(self):
        chain = FakeChain({"raw": RAW, "parsed": ANSWER, "parsing_error": None})

        result = ask_question(chain, OutputStructure, "질문", "루미큐브", "s1")

        self.assertIs(result, ANSWER)
        self.assertEqual(
            chain.calls[0],
            (
                {"question": "질문", "game_title": "루미큐브"},
                {"configurable": {"session_id": "s1"}},
            ),
        )

    def test_raises_on_parsing_error(self):
        chain = FakeChain(
            {"raw": RAW, "parsed": None, "parsing_error": ValueError("boom")}
        )

        with self.assertRaises(StructuredOutputError):
            ask_question(chain, OutputStructure, "질문", "루미큐브")

    def test_raises_when_parsed_is_missing(self):
        chain = FakeChain({"raw": RAW, "parsed": None, "parsing_error": None})

        with self.assertRaises(StructuredOutputError):
            ask_question(chain, OutputStructure, "질문", "루미큐브")


if __name__ == "__main__":
    unittest.main()

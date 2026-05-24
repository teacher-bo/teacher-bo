import math
import os
from typing import Iterable, Optional, Protocol, Sequence

from langchain_core.embeddings import Embeddings
from openai import OpenAI

DEFAULT_DEEPINFRA_BASE_URL = "https://api.deepinfra.com/v1/openai"
DEFAULT_EMBEDDING_MODEL = "Qwen/Qwen3-Embedding-8B"
DEFAULT_QUERY_INSTRUCTION = (
    "Given a Korean board game rule question, retrieve the rulebook passage "
    "that directly answers the question."
)
DEFAULT_BATCH_SIZE = 64


class EmbeddingData(Protocol):
    index: int
    embedding: Sequence[float]


class EmbeddingResponse(Protocol):
    data: Sequence[EmbeddingData]


class EmbeddingsEndpoint(Protocol):
    def create(
        self,
        *,
        model: str,
        input: list[str],
        encoding_format: str,
    ) -> EmbeddingResponse: ...


class EmbeddingsClient(Protocol):
    embeddings: EmbeddingsEndpoint


def _read_batch_size(value: Optional[str]) -> int:
    if value is None:
        return DEFAULT_BATCH_SIZE
    try:
        batch_size = int(value)
    except ValueError as exc:
        raise ValueError("RAG_EMBEDDING_BATCH_SIZE must be an integer") from exc
    if batch_size <= 0:
        raise ValueError("RAG_EMBEDDING_BATCH_SIZE must be greater than 0")
    return batch_size


def _normalize_vector(vector: Iterable[float]) -> list[float]:
    values = [float(value) for value in vector]
    norm = math.sqrt(sum(value * value for value in values))
    if norm == 0:
        return values
    return [value / norm for value in values]


class DeepInfraEmbeddings(Embeddings):
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        query_instruction: Optional[str] = None,
        batch_size: Optional[int] = None,
        client: Optional[EmbeddingsClient] = None,
    ) -> None:
        self.api_key = api_key or os.getenv("DEEPINFRA_API_KEY")
        if not self.api_key and client is None:
            raise ValueError("DEEPINFRA_API_KEY is required")
        self.base_url = (
            base_url
            or os.getenv("DEEPINFRA_BASE_URL")
            or DEFAULT_DEEPINFRA_BASE_URL
        )
        self.model = model or os.getenv("RAG_EMBEDDING_MODEL") or DEFAULT_EMBEDDING_MODEL
        self.query_instruction = (
            query_instruction
            if query_instruction is not None
            else os.getenv("RAG_EMBEDDING_QUERY_INSTRUCTION")
            or DEFAULT_QUERY_INSTRUCTION
        )
        self.batch_size = (
            batch_size
            if batch_size is not None
            else _read_batch_size(os.getenv("RAG_EMBEDDING_BATCH_SIZE"))
        )
        if self.batch_size <= 0:
            raise ValueError("RAG_EMBEDDING_BATCH_SIZE must be greater than 0")
        self.client = client or OpenAI(api_key=self.api_key, base_url=self.base_url)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._embed_texts(texts)

    def embed_query(self, text: str) -> list[float]:
        return self._embed_texts([self._format_query(text)])[0]

    def _format_query(self, text: str) -> str:
        if not self.query_instruction:
            return text
        return f"Instruct: {self.query_instruction}\nQuery: {text}"

    def _embed_texts(self, texts: list[str]) -> list[list[float]]:
        embeddings: list[list[float]] = []
        for index in range(0, len(texts), self.batch_size):
            embeddings.extend(self._embed_batch(texts[index : index + self.batch_size]))
        return embeddings

    def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        response = self.client.embeddings.create(
            model=self.model,
            input=texts,
            encoding_format="float",
        )
        ordered_data = sorted(response.data, key=lambda item: item.index)
        vectors = [_normalize_vector(item.embedding) for item in ordered_data]
        if len(vectors) != len(texts):
            raise ValueError("DeepInfra embedding provider returned mismatched results")
        return vectors

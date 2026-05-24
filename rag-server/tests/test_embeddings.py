import unittest
from dataclasses import dataclass
from typing import Sequence

from app.core.embeddings import DEFAULT_QUERY_INSTRUCTION, DeepInfraEmbeddings


@dataclass
class FakeEmbeddingData:
    index: int
    embedding: Sequence[float]


@dataclass
class FakeEmbeddingResponse:
    data: Sequence[FakeEmbeddingData]


class FakeEmbeddingsEndpoint:
    def __init__(self) -> None:
        self.calls: list[tuple[str, list[str], str]] = []

    def create(
        self,
        *,
        model: str,
        input: list[str],
        encoding_format: str,
    ) -> FakeEmbeddingResponse:
        self.calls.append((model, input, encoding_format))
        data = [
            FakeEmbeddingData(index=index, embedding=[float(index + 3), 4.0])
            for index in range(len(input))
        ]
        return FakeEmbeddingResponse(data=list(reversed(data)))


class FakeEmbeddingsClient:
    def __init__(self, endpoint: FakeEmbeddingsEndpoint) -> None:
        self.embeddings = endpoint


class DeepInfraEmbeddingsTest(unittest.TestCase):
    def test_embed_documents_sends_raw_chunks_in_batches_and_normalizes(self) -> None:
        endpoint = FakeEmbeddingsEndpoint()
        embeddings = DeepInfraEmbeddings(
            client=FakeEmbeddingsClient(endpoint),
            model="test-model",
            query_instruction="test instruction",
            batch_size=2,
        )

        vectors = embeddings.embed_documents(["chunk one", "chunk two", "chunk three"])

        self.assertEqual(
            endpoint.calls,
            [
                ("test-model", ["chunk one", "chunk two"], "float"),
                ("test-model", ["chunk three"], "float"),
            ],
        )
        self.assertEqual(len(vectors), 3)
        self.assertAlmostEqual(vectors[0][0], 0.6)
        self.assertAlmostEqual(vectors[0][1], 0.8)
        self.assertLess(vectors[0][0], vectors[1][0])

    def test_embed_query_applies_instruction_prefix_only_to_query(self) -> None:
        endpoint = FakeEmbeddingsEndpoint()
        embeddings = DeepInfraEmbeddings(
            client=FakeEmbeddingsClient(endpoint),
            model="test-model",
            batch_size=64,
        )

        embeddings.embed_query("루미큐브 시작 타일 수는?")

        self.assertEqual(
            endpoint.calls[0][1],
            [
                f"Instruct: {DEFAULT_QUERY_INSTRUCTION}\nQuery: 루미큐브 시작 타일 수는?"
            ],
        )

    def test_rejects_mismatched_response_count(self) -> None:
        class ShortEndpoint(FakeEmbeddingsEndpoint):
            def create(
                self,
                *,
                model: str,
                input: list[str],
                encoding_format: str,
            ) -> FakeEmbeddingResponse:
                return FakeEmbeddingResponse(data=[])

        embeddings = DeepInfraEmbeddings(
            client=FakeEmbeddingsClient(ShortEndpoint()),
        )

        with self.assertRaises(ValueError):
            embeddings.embed_documents(["chunk"])


if __name__ == "__main__":
    unittest.main()

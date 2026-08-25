import os
import unittest
from contextlib import contextmanager

from langchain_core.messages import HumanMessage

from app.core.chain import (
    DEFAULT_LLM_MODEL,
    DEFAULT_REASONING_EFFORT,
    DEFAULT_RETRIEVE_K,
    DEFAULT_TEMPERATURE,
    build_llm,
    get_llm_model,
    get_reasoning_effort,
    get_retrieve_k,
    get_temperature,
    is_reasoning_model,
    validate_llm_config,
)

LLM_ENV_KEYS = (
    "RAG_LLM_MODEL",
    "RAG_REASONING_EFFORT",
    "RAG_LLM_TEMPERATURE",
    "RAG_RETRIEVE_K",
)


@contextmanager
def env(**overrides: str | None):
    previous = {key: os.environ.get(key) for key in LLM_ENV_KEYS}
    for key in LLM_ENV_KEYS:
        os.environ.pop(key, None)
    for key, value in overrides.items():
        if value is not None:
            os.environ[key] = value
    try:
        yield
    finally:
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


class ChainConfigTest(unittest.TestCase):
    def test_defaults(self):
        with env():
            self.assertEqual(get_llm_model(), DEFAULT_LLM_MODEL)
            self.assertEqual(get_reasoning_effort(), DEFAULT_REASONING_EFFORT)
            self.assertEqual(get_temperature(), DEFAULT_TEMPERATURE)
            self.assertEqual(get_retrieve_k(), DEFAULT_RETRIEVE_K)

    def test_default_model_is_a_reasoning_model(self):
        self.assertTrue(is_reasoning_model(DEFAULT_LLM_MODEL))

    def test_reasoning_model_detection(self):
        for model in ("gpt-5.6-luna", "gpt-5-nano", "gpt-5-mini", "o3-mini", "o4-mini"):
            with self.subTest(model=model):
                self.assertTrue(is_reasoning_model(model))

        for model in (
            "gpt-4o-mini",
            "gpt-4.1-mini",
            "gpt-4.1-nano",
            "gpt-4o",
            "gpt-5-chat-latest",
        ):
            with self.subTest(model=model):
                self.assertFalse(is_reasoning_model(model))

    def test_blank_env_falls_back_to_default(self):
        with env(RAG_LLM_MODEL="   ", RAG_RETRIEVE_K=" "):
            self.assertEqual(get_llm_model(), DEFAULT_LLM_MODEL)
            self.assertEqual(get_retrieve_k(), DEFAULT_RETRIEVE_K)

    def test_reasoning_effort_override(self):
        with env(RAG_REASONING_EFFORT="low"):
            self.assertEqual(get_reasoning_effort(), "low")

    def test_invalid_reasoning_effort_raises(self):
        with env(RAG_REASONING_EFFORT="turbo"):
            with self.assertRaises(ValueError):
                get_reasoning_effort()

    def test_invalid_temperature_raises(self):
        with env(RAG_LLM_TEMPERATURE="hot"):
            with self.assertRaises(ValueError):
                get_temperature()

    def test_out_of_range_temperature_raises(self):
        with env(RAG_LLM_TEMPERATURE="2.5"):
            with self.assertRaises(ValueError):
                get_temperature()

    def test_invalid_retrieve_k_raises(self):
        with env(RAG_RETRIEVE_K="many"):
            with self.assertRaises(ValueError):
                get_retrieve_k()

    def test_non_positive_retrieve_k_raises(self):
        with env(RAG_RETRIEVE_K="0"):
            with self.assertRaises(ValueError):
                get_retrieve_k()

    def test_validate_llm_config_rejects_bad_reasoning_effort(self):
        with env(RAG_LLM_MODEL="gpt-5.6-luna", RAG_REASONING_EFFORT="turbo"):
            with self.assertRaises(ValueError):
                validate_llm_config()

    def test_validate_llm_config_ignores_temperature_for_reasoning_model(self):
        with env(RAG_LLM_MODEL="gpt-5.6-luna", RAG_LLM_TEMPERATURE="hot"):
            validate_llm_config()

    def test_validate_llm_config_checks_temperature_for_legacy_model(self):
        with env(RAG_LLM_MODEL="gpt-4o-mini", RAG_LLM_TEMPERATURE="hot"):
            with self.assertRaises(ValueError):
                validate_llm_config()


class BuildLLMTest(unittest.TestCase):
    def setUp(self):
        self._previous_key = os.environ.get("OPENAI_API_KEY")
        os.environ["OPENAI_API_KEY"] = "sk-test-not-real"

    def tearDown(self):
        if self._previous_key is None:
            os.environ.pop("OPENAI_API_KEY", None)
        else:
            os.environ["OPENAI_API_KEY"] = self._previous_key

    def _payload(self) -> dict:
        return build_llm()._get_request_payload([HumanMessage("hi")])

    def test_reasoning_model_sends_effort_without_temperature(self):
        with env(RAG_LLM_MODEL="gpt-5.6-luna", RAG_REASONING_EFFORT="none"):
            payload = self._payload()

        self.assertEqual(payload["model"], "gpt-5.6-luna")
        self.assertEqual(payload["reasoning_effort"], "none")
        self.assertNotIn("temperature", payload)

    def test_legacy_model_sends_temperature_without_effort(self):
        with env(RAG_LLM_MODEL="gpt-4o-mini", RAG_LLM_TEMPERATURE="0.3"):
            payload = self._payload()

        self.assertEqual(payload["model"], "gpt-4o-mini")
        self.assertEqual(payload["temperature"], 0.3)
        self.assertNotIn("reasoning_effort", payload)


if __name__ == "__main__":
    unittest.main()

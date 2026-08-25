# RAG LLM Model Migration: gpt-4o-mini → gpt-5.6-luna

## Summary

The RAG answer model moved from `gpt-4o-mini` to `gpt-5.6-luna` with `reasoning.effort = none`, and the
JSON contract moved from prompt-injected `format_instructions` + `JsonOutputParser` to OpenAI
Structured Outputs (`json_schema`, strict). Every knob is environment-driven so a rollback is a
variable change, not a deploy of new code.

## Why

- `gpt-4o-mini` has an Oct 2023 knowledge cutoff and is the weakest link for this prompt, which is a
  7-step ordered decision procedure plus negative constraints (`source` must come from the
  `[... Source: ...]` header, never from a QA pair's `A:` text). Instruction adherence, not raw
  knowledge, is what drives the answer-rate/hallucination numbers in `RAG_SYSTEM.md`.
- `gpt-5.6-luna` is OpenAI's designated successor for both `gpt-4.1-nano` (shutdown 2026-10-23) and
  the `gpt-5-nano-2025-08-07` snapshot (shutdown 2026-12-11), so this migration was due regardless.
- Cost delta is negligible at this workload — see the table below.
- `reasoning.effort` gives a tuning axis the previous setup did not have: raise it to `low` if answer
  rate is short, keep `none` to protect the sub-3s latency budget.

## Cost comparison

Measured token profile per request (378 chunks averaging 224 chars; system prompt 2.9K chars):

```
input  ~= 2,200 tok  (system 700 + context(k=5) 1,200 + history 200 + question 100)
output ~=   150 tok  (4-field JSON, 1-3 Korean sentences)
```

`format_instructions` (~300 tok) was removed from every request by the Structured Outputs switch.

| Model | Input $/1M | Output $/1M | Cost / 10K requests |
| :--- | ---: | ---: | ---: |
| `gpt-5-nano` | 0.05 | 0.40 | $1.70 |
| `gpt-4.1-nano` | 0.10 | 0.40 | $2.80 |
| `gpt-4o-mini` (previous) | 0.15 | 0.60 | $4.20 |
| **`gpt-5.6-luna` (effort=none)** | **0.20** | **1.20** | **$6.20** |
| `gpt-5.6-luna` (effort=low) | 0.20 | 1.20 | $8.00 |
| `gpt-5-mini` | 0.25 | 2.00 | $9.50 |
| `gpt-4.1-mini` | 0.40 | 1.60 | $11.20 |
| `gpt-5.6-terra` | 2.00 | 12.00 | $80.00 |

`gpt-5-nano` is cheaper but its snapshot is retired 2026-12-11 and its replacement is `gpt-5.6-luna`,
so taking it would mean migrating twice.

## Prompt caching: not active

Automatic prompt caching needs a ≥1,024-token identical prefix (gpt-5.6+; 2,048 on earlier models).
The static prefix here is the system message only, ~700 tokens, so caching does **not** engage —
before or after this change. Removing `format_instructions` moved it further below the threshold.
Padding the prompt purely to cross the threshold was rejected. Caching becomes worth revisiting if
the system prompt grows past ~1,024 tokens for a real reason (for example few-shot examples for the
`source` extraction rule).

## Breaking API detail

Reasoning models reject `temperature`:

```
Unsupported value: 'temperature' does not support 0.3 with this model. Only the default (1) value is supported.
```

`build_llm()` in `rag-server/app/core/chain.py` therefore branches on the model name: reasoning models
(`gpt-5*`, `o1*`, `o3*`, `o4*`) get `reasoning_effort` and no `temperature`; everything else gets
`temperature` and no `reasoning_effort`. This is covered by `tests/test_chain_config.py`, which
asserts against the actual request payload rather than the constructor arguments.

## Changes

- `rag-server/app/core/chain.py`
  - `build_llm()` with the reasoning/legacy branch described above.
  - Env-driven config: `RAG_LLM_MODEL`, `RAG_REASONING_EFFORT`, `RAG_LLM_TEMPERATURE`, `RAG_RETRIEVE_K`,
    each validated with an explicit error instead of silently falling back.
  - `validate_llm_config()` runs at import time from `app/main.py` so a bad variable fails the
    container at boot, not on the first user question.
  - `with_structured_output(OutputStructure, method="json_schema", include_raw=True)` replaces
    `JsonOutputParser`. `include_raw=True` keeps an `AIMessage` available for chat history, wired via
    `output_messages_key="raw"`.
  - `ask_question()` returns a typed `OutputStructure` and raises `StructuredOutputError` when the
    model fails the schema.
- `rag-server/app/models/schemas.py` — `answer_type` is now the `AnswerType` literal
  (`YES`/`NO`/`EXPLAIN`/`CANNOT_ANSWER`) instead of a bare `str`, so the enum is enforced by the API.
  `HealthCheckResponse` reports `llm_model` and `reasoning_effort`.
- `rag-server/app/config/prompts.py` — `{format_instructions}` removed from `user_template`.
- `rag-server/app/routers/chat.py` — caches the whole chain per game (previously only the vectorstore
  was cached while the chain and LLM were rebuilt on every request). Unknown `game_key` now returns
  404 from an explicit check, so config and schema failures correctly surface as 500 instead of
  being misreported as 404 by the old blanket `except ValueError`.
- `rag-server/requirements.txt` — langchain family pinned to `>=0.3,<1.0` (1.x changes
  `RunnableWithMessageHistory`), `openai>=2.0.0` for Structured Outputs.
- `.github/workflows/deploy-backend.yml` — the four new variables are passed through to the container
  with defaults, overridable as GitHub Variables.

## Rollback

Set the GitHub Variable and redeploy — no code change:

```
RAG_LLM_MODEL=gpt-4o-mini
```

`RAG_LLM_TEMPERATURE` (default `0.3`) applies again automatically, and `reasoning_effort` is dropped
from the request. Confirm which model is live with `GET /api/v1/health`:

```json
{ "status": "ok", "llm_model": "gpt-5.6-luna", "reasoning_effort": "none" }
```

## Follow-up

- Re-run the 25-question evaluation set from `RAG_SYSTEM.md` against
  `gpt-4o-mini` / `gpt-5.6-luna(none)` / `gpt-5.6-luna(low)` and record answer rate, hallucination
  rate, and p95 latency. The existing table's numbers are `gpt-4o-mini` measurements.
- `RAG_RETRIEVE_K` defaults to `5`, matching the code that was actually running, even though
  `RAG_SYSTEM.md` documented `3` as the experimental optimum. Deliberately left unchanged here so the
  model swap can be measured in isolation; re-test `k` separately.

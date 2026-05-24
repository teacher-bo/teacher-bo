import json
import os
from typing import Iterable, Optional

import redis
from dotenv import load_dotenv
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, messages_from_dict, messages_to_dict

load_dotenv()

MAX_HISTORY = 2
DEFAULT_HISTORY_TTL_SECONDS = 86400
REDIS_KEY_PREFIX = "teacher-bo:rag:history"

_redis_client: Optional[redis.Redis] = None


def _get_history_ttl_seconds() -> int:
    raw_ttl = os.getenv("RAG_HISTORY_TTL_SECONDS")
    if raw_ttl is None:
        return DEFAULT_HISTORY_TTL_SECONDS

    try:
        ttl = int(raw_ttl)
    except ValueError as exc:
        raise ValueError("RAG_HISTORY_TTL_SECONDS must be an integer") from exc

    if ttl <= 0:
        raise ValueError("RAG_HISTORY_TTL_SECONDS must be greater than 0")

    return ttl


def _get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            _redis_client = redis.Redis.from_url(redis_url)
        else:
            redis_password = os.getenv("REDIS_PASSWORD")
            if not redis_password:
                raise ValueError("REDIS_URL or REDIS_PASSWORD is required")
            _redis_client = redis.Redis(
                host=os.getenv("REDIS_HOST", "redis"),
                port=int(os.getenv("REDIS_PORT", "6379")),
                db=int(os.getenv("REDIS_DB", "1")),
                password=redis_password,
            )
    return _redis_client


class RedisTTLChatMessageHistory(BaseChatMessageHistory):
    def __init__(
        self,
        session_id: str,
        client: redis.Redis,
        ttl_seconds: int,
        max_history: int = MAX_HISTORY,
    ) -> None:
        self.session_id = session_id
        self.client = client
        self.ttl_seconds = ttl_seconds
        self.max_history = max_history
        self.key = f"{REDIS_KEY_PREFIX}:{session_id}"

    @property
    def messages(self) -> list[BaseMessage]:
        raw_messages = self.client.lrange(self.key, 0, -1)
        if not raw_messages:
            return []

        serialized_messages = [
            json.loads(
                item.decode("utf-8") if isinstance(item, bytes) else str(item)
            )
            for item in raw_messages
        ]
        return messages_from_dict(serialized_messages)

    def add_messages(self, messages: Iterable[BaseMessage]) -> None:
        next_messages = [*self.messages, *messages][-self.max_history :]
        serialized_messages = [
            json.dumps(message, ensure_ascii=False)
            for message in messages_to_dict(next_messages)
        ]

        pipe = self.client.pipeline()
        pipe.delete(self.key)
        if serialized_messages:
            pipe.rpush(self.key, *serialized_messages)
            pipe.expire(self.key, self.ttl_seconds)
        pipe.execute()

    def clear(self) -> None:
        self.client.delete(self.key)


def get_session_history(session_id: str) -> BaseChatMessageHistory:
    return RedisTTLChatMessageHistory(
        session_id=session_id,
        client=_get_redis_client(),
        ttl_seconds=_get_history_ttl_seconds(),
    )


def delete_session_history(session_id: str) -> bool:
    get_session_history(session_id).clear()
    return True

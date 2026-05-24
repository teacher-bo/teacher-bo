import unittest

from langchain_core.messages import AIMessage, HumanMessage

from app.core.memory import RedisTTLChatMessageHistory


class FakePipeline:
    def __init__(self, client):
        self.client = client

    def delete(self, key):
        self.client.delete(key)
        return self

    def rpush(self, key, *values):
        self.client.rpush(key, *values)
        return self

    def expire(self, key, ttl):
        self.client.expire(key, ttl)
        return self

    def execute(self):
        return []


class FakeRedis:
    def __init__(self):
        self.values = {}
        self.ttls = {}

    def lrange(self, key, start, end):
        values = self.values.get(key, [])
        stop = None if end == -1 else end + 1
        return values[start:stop]

    def pipeline(self):
        return FakePipeline(self)

    def delete(self, key):
        self.values.pop(key, None)
        self.ttls.pop(key, None)

    def rpush(self, key, *values):
        self.values.setdefault(key, []).extend(values)

    def expire(self, key, ttl):
        self.ttls[key] = ttl


class RedisTTLChatMessageHistoryTest(unittest.TestCase):
    def test_add_messages_trims_to_recent_pair_and_sets_ttl(self):
        client = FakeRedis()
        history = RedisTTLChatMessageHistory(
            session_id="session-1",
            client=client,
            ttl_seconds=120,
            max_history=2,
        )

        history.add_messages(
            [
                HumanMessage(content="first"),
                AIMessage(content="answer first"),
                HumanMessage(content="second"),
                AIMessage(content="answer second"),
            ]
        )

        self.assertEqual(
            [message.content for message in history.messages],
            ["second", "answer second"],
        )
        self.assertEqual(client.ttls[history.key], 120)

    def test_clear_deletes_session_history(self):
        client = FakeRedis()
        history = RedisTTLChatMessageHistory(
            session_id="session-1",
            client=client,
            ttl_seconds=120,
        )

        history.add_messages([HumanMessage(content="question")])
        history.clear()

        self.assertEqual(history.messages, [])
        self.assertNotIn(history.key, client.ttls)


if __name__ == "__main__":
    unittest.main()

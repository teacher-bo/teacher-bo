"""Game configurations for available board games."""

from typing import TypedDict


class GameConfig(TypedDict):
    """게임 설정 타입"""
    name: str
    db_path: str
    collection: str


AVAILABLE_GAMES: dict[str, GameConfig] = {
    "sabotage": {
        "name": "사보타지",
        "db_path": "./chroma_db/sabotage",
        "collection": "sabotage_rulebook"
    },
    "rummikub": {
        "name": "루미큐브",
        "db_path": "./chroma_db/rummikub",
        "collection": "rummikub_rulebook"
    },
    "halligalli": {
        "name": "할리갈리",
        "db_path": "./chroma_db/halligalli",
        "collection": "halligalli_rulebook"
    },
}

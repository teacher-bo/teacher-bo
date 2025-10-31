"""Configuration module for RAG chatbot."""

from .games import AVAILABLE_GAMES, GameConfig
from .prompts import PromptTemplate

__all__ = ["AVAILABLE_GAMES", "GameConfig", "PromptTemplate"]

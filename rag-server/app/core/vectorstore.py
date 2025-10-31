"""Vector store management."""

from langchain_upstage import UpstageEmbeddings
from langchain_chroma import Chroma


def load_vectorstore(game_key: str, available_games: dict) -> tuple[Chroma, str]:
    """
    게임별 ChromaDB 벡터스토어 로드
    
    Args:
        game_key: 게임 식별자 (예: "sabotage")
        available_games: 게임 설정 딕셔너리
        
    Returns:
        tuple[Chroma, str]: (벡터스토어, 게임 이름)
        
    Raises:
        ValueError: 존재하지 않는 게임 키
    """
    if game_key not in available_games:
        raise ValueError(f"게임을 찾을 수 없습니다: {game_key}")
    
    game_config = available_games[game_key]
    
    embeddings = UpstageEmbeddings(model="solar-embedding-1-large-passage")
    vectorstore = Chroma(
        persist_directory=game_config["db_path"],
        embedding_function=embeddings,
        collection_name=game_config["collection"]
    )
    
    return vectorstore, game_config["name"]

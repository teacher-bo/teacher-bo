import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain.schema import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

RAG_SERVER_DIR = Path(__file__).resolve().parent.parent / "rag-server"
sys.path.insert(0, str(RAG_SERVER_DIR))

from app.core.embeddings import DeepInfraEmbeddings

# 환경 변수 로드
load_dotenv()

def load_json_documents(file_path: Path):
    """JSON 파일을 읽어서 Document 리스트로 변환"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ 파일 로드 실패 ({file_path.name}): {e}")
        return []
    
    documents = []
    for item in data:
        doc_type = item.get('type', 'unknown')
        
        # 메타데이터: 원본 데이터 그대로 복사
        metadata = item.copy()
        metadata["source_file"] = file_path.name
        
        # ChromaDB 호환성을 위해 리스트/딕셔너리 타입은 문자열로 변환
        for key, value in metadata.items():
            if isinstance(value, (list, dict)):
                metadata[key] = str(value)
        
        # 1. QA 데이터 처리
        if doc_type == 'QA':
            question = item.get('question', '')
            answer = item.get('answer', '')
            content = f"Q: {question}\nA: {answer}"
            
        # 2. Rulebook 데이터 처리
        elif doc_type == 'rulebook':
            title = item.get("section_title", "")
            body = item.get("content", "")
            content = f"{title}\n{body}" if title else body
            
        else:
            content = item.get('content', '')
            
        documents.append(Document(page_content=content, metadata=metadata))
    
    return documents

def main():
    print("=" * 80)
    print("📚 JSON 룰북/QA 임베딩 시스템")
    print("=" * 80)

    # 경로 설정
    base_dir = Path(__file__).parent
    json_root = base_dir / "rulebooks" / "rulebook_json"
    qa_dir = json_root / "QA"
    rulebook_dir = json_root / "rulebook"
    
    # 게임별로 문서 모으기 (Dictionary: game_name -> list of documents)
    games = {} 
    
    # 1. QA 파일 탐색 및 로드
    if qa_dir.exists():
        for file in qa_dir.glob("*_QA.json"):
            # 파일명 규칙: {게임명}_QA.json (예: rummikub_QA.json)
            game_name = file.stem.replace("_QA", "")
            docs = load_json_documents(file)
            
            if game_name not in games:
                games[game_name] = []
            games[game_name].extend(docs)
            print(f"📖 [{game_name}] QA 데이터 로드: {len(docs)}개 항목")

    # 2. Rulebook 파일 탐색 및 로드
    if rulebook_dir.exists():
        for file in rulebook_dir.glob("*_rulebook.json"):
            # 파일명 규칙: {게임명}_rulebook.json (예: rummikub_rulebook.json)
            game_name = file.stem.replace("_rulebook", "")
            docs = load_json_documents(file)
            
            if game_name not in games:
                games[game_name] = []
            games[game_name].extend(docs)
            print(f"📖 [{game_name}] Rulebook 데이터 로드: {len(docs)}개 항목")
            
    if not games:
        print("❌ 처리할 JSON 파일을 찾지 못했습니다.")
        print(f"   경로 확인: {json_root}")
        return

    # 임베딩 모델 설정
    print("\n🤖 임베딩 모델(DeepInfra Qwen3) 준비 중...")
    embeddings = DeepInfraEmbeddings()
    
    # 게임별로 벡터 DB 저장
    for game_name, docs in games.items():
        print(f"\n🚀 '{game_name}' 처리 시작 (총 문서: {len(docs)}개)")
        
        # 텍스트 분할 (JSON 항목이 너무 길 경우를 대비)
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100
        )
        splits = text_splitter.split_documents(docs)
        print(f"   - 청크 분할 완료: {len(splits)}개")

        # 분할 결과 미리보기
        print(f"   📋 청크 미리보기 (처음 3개):")
        for i, split in enumerate(splits[:3]):
            print(f"     [Chunk {i+1}]")
            # 보기 좋게 줄바꿈 제거 후 출력
            preview_content = split.page_content[:200].replace('\n', ' ')
            print(f"     Content: {preview_content}...") 
            print(f"     Metadata: {split.metadata}")
            print("     " + "-" * 40)
        
        # ChromaDB 저장 경로 및 컬렉션 이름
        persist_directory = f"./chroma_db/{game_name}"
        collection_name = f"{game_name}_rulebook" 
        
        print(f"   - 저장 경로: {persist_directory}")
        print(f"   - 컬렉션명: {collection_name}")
        
        # 벡터 스토어 생성 및 저장
        vectorstore = Chroma.from_documents(
            documents=splits,
            embedding=embeddings,
            persist_directory=persist_directory,
            collection_name=collection_name,
            collection_metadata={"hnsw:space": "cosine"}
        )
        print(f"✅ '{game_name}' 저장 완료!")
        
        # 간단한 검색 테스트
        print("   🔍 검색 테스트: '게임 준비는 어떻게 해?'")
        results = vectorstore.similarity_search("게임 준비는 어떻게 해?", k=1)
        if results:
            print(f"   👉 결과: {results[0].page_content[:100]}...")

    print("\n" + "=" * 80)
    print("✨ 모든 작업 완료!")
    print("=" * 80)

if __name__ == "__main__":
    main()

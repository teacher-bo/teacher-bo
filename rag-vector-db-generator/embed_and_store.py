from dotenv import load_dotenv
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
import os
from pathlib import Path
import sys

RAG_SERVER_DIR = Path(__file__).resolve().parent.parent / "rag-server"
sys.path.insert(0, str(RAG_SERVER_DIR))

from app.core.embeddings import DeepInfraEmbeddings

# 환경 변수 로드
load_dotenv()


def get_available_rulebooks():
    """Get list of available rulebooks from final-rulebook directory"""
    base_dir = Path(__file__).parent
    final_dir = base_dir / "rulebooks" / "final-rulebook"
    
    if not final_dir.exists():
        return []
    
    rulebooks = []
    for file in final_dir.glob("*.rulebook.txt"):
        game_name = file.stem.replace(".rulebook", "")
        rulebooks.append({
            "name": game_name,
            "path": file
        })
    
    return rulebooks


def process_single_rulebook(game_name: str, file_path: Path):
    """Process a single rulebook and store in ChromaDB"""
    print("=" * 80)
    print(f"📚 {game_name} 룰북 임베딩 및 ChromaDB 저장")
    print("=" * 80)
    
    # 1. 텍스트 파일 로드
    print("\n1️⃣ 텍스트 파일 로딩 중...")
    loader = TextLoader(str(file_path), encoding='utf-8')
    documents = loader.load()
    print(f"✅ 문서 로드 완료: {len(documents)}개 문서")

    # 2-1. 마크다운 헤더로 먼저 분할
    print("\n2️⃣ 마크다운 헤더로 1차 분할 중...")
    headers_to_split_on = [
        ("#", "Header 1"),
        ("##", "Header 2"),
        ("###", "Header 3"),
    ]
    markdown_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=headers_to_split_on,
        strip_headers=False  # 헤더를 유지
    )
    
    # 텍스트를 문자열로 변환하여 분할
    markdown_splits = markdown_splitter.split_text(documents[0].page_content)
    print(f"✅ 1차 분할 완료: {len(markdown_splits)}개 섹션")
    
    # 2-2. 각 섹션을 다시 작은 청크로 분할
    print("\n3️⃣ 각 섹션을 2차 분할 중...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=300,  # 청크 크기 (300자)
        chunk_overlap=50,  # 청크 간 겹침 (문맥 연결)
        separators=["\n\n", "\n", " ", ""],
    )
    splits = text_splitter.split_documents(markdown_splits)
    print(f"✅ 2차 분할 완료: {len(splits)}개 청크")
    
    # 분할 결과 미리보기
    print("\n📋 분할 결과 미리보기 (처음 3개):")
    for i, split in enumerate(splits[:]):
        print(f"\n[청크 {i+1}]")
        print(f"메타데이터: {split.metadata}")
        print(f"내용: {split.page_content[:]}...")
        print("-" * 40)
    
    print("\n4️⃣ 임베딩 모델 설정 중...")
    embeddings = DeepInfraEmbeddings()
    print("✅ DeepInfra Qwen3 Embeddings 준비 완료")
    
    # 4. ChromaDB에 저장
    print("\n5️⃣ ChromaDB에 저장 중...")
    persist_directory = f"./chroma_db/{game_name}"
    
    vectorstore = Chroma.from_documents(
        documents=splits,
        embedding=embeddings,
        persist_directory=persist_directory,
        collection_name=f"{game_name}_rulebook",
        collection_metadata={"hnsw:space": "cosine"}
    )
    print(f"✅ ChromaDB 저장 완료 (코사인 유사도): {persist_directory}")
    
    # 5. 테스트 검색
    print("\n6️⃣ 테스트 검색 수행 중...")
    test_query = "게임 인원은 몇 명인가요?"
    results = vectorstore.similarity_search(test_query, k=3)
    
    print(f"\n🔍 쿼리: '{test_query}'")
    print("-" * 80)
    for i, doc in enumerate(results, 1):
        print(f"\n[결과 {i}]")
        print(doc.page_content[:200])
        if len(doc.page_content) > 200:
            print("...")
    
    print("\n" + "=" * 80)
    print(f"🎉 {game_name} ChromaDB 저장 완료!")
    print(f"📂 저장 위치: {os.path.abspath(persist_directory)}")
    print("=" * 80)
    

def main():
    """Main function to process all rulebooks"""
    print("=" * 80)
    print("📚 룰북 임베딩 시스템")
    print("=" * 80)
    print()
    
    # Get available rulebooks
    rulebooks = get_available_rulebooks()
    
    if not rulebooks:
        print("❌ rulebooks/final-rulebook/ 폴더에 룰북 파일이 없습니다!")
        print("   먼저 process_rulebooks.py를 실행하여 룰북을 처리하세요.")
        return
    
    print(f"📖 발견된 룰북: {len(rulebooks)}개")
    for rb in rulebooks:
        print(f"  - {rb['name']}")
    print()
    
    # Process each rulebook
    for rb in rulebooks:
        process_single_rulebook(rb['name'], rb['path'])
        print()
    
    print("=" * 80)
    print("✨ 모든 룰북 처리 완료!")
    print("=" * 80)


if __name__ == "__main__":
    main()

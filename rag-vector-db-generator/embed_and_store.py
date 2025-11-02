from dotenv import load_dotenv
from langchain_upstage import UpstageEmbeddings
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
import os

# 환경 변수 로드
load_dotenv()

print("=" * 80)
print("📚 사보타지 룰북 임베딩 및 ChromaDB 저장")
print("=" * 80)

# 1. 텍스트 파일 로드
print("\n1️⃣ 텍스트 파일 로딩 중...")
loader = TextLoader("rulebooks/sabotage_rulebook.txt", encoding='utf-8')
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
    chunk_size=1000,  # 청크 크기 (1000자 = 약 2-3개 문단)
    chunk_overlap=100,  # 청크 간 겹침 (문맥 연결)
    separators=["\n\n", "\n", " ", ""],
)
splits = text_splitter.split_documents(markdown_splits)
print(f"✅ 2차 분할 완료: {len(splits)}개 청크")

# 분할 결과 미리보기
print("\n📋 분할 결과 미리보기 (처음 3개):")
for i, split in enumerate(splits[:3]):
    print(f"\n[청크 {i+1}]")
    print(f"메타데이터: {split.metadata}")
    print(f"내용: {split.page_content[:150]}...")
    print("-" * 40)

# 3. 임베딩 모델 설정 (Upstage)
print("\n4️⃣ 임베딩 모델 설정 중...")
embeddings = UpstageEmbeddings(
    model="solar-embedding-1-large-passage"
)
print("✅ Upstage Solar Embeddings 준비 완료")

# 4. ChromaDB에 저장
print("\n5️⃣ ChromaDB에 저장 중...")
persist_directory = "./chroma_db/sabotage"  # 로컬 저장 경로 # TODO 경로 변경함

vectorstore = Chroma.from_documents(
    documents=splits,
    embedding=embeddings,
    persist_directory=persist_directory,
    collection_name="sabotage_rulebook",
    collection_metadata={"hnsw:space": "cosine"}  # 명시적으로 코사인 유사도 설정
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
print("🎉 완료! ChromaDB가 로컬에 저장되었습니다.")
print(f"📂 저장 위치: {os.path.abspath(persist_directory)}")
print("=" * 80)

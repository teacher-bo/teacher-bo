from langchain_community.document_loaders import PDFPlumberLoader

class PDFLoader:
    """PDF 문서 로더 클래스"""
    
    def __init__(self, file_path: str):
        self.file_path = file_path

    def load_documents(self):
        """PDF 파일을 로드하여 LangChain Document 객체 리스트로 반환"""
        loader = PDFPlumberLoader(self.file_path)
        documents = loader.load()
        return documents

# 테스트 코드
if __name__ == "__main__":
    pdf_path = "rulebooks/Sabotage_rulebook.pdf"
    
    print(f"PDF 로딩 중: {pdf_path}")
    print("=" * 80)
    
    loader = PDFLoader(pdf_path)
    documents = loader.load_documents()
    
    print(f"\n총 페이지 수: {len(documents)}")
    print("=" * 80)
    
    # 각 페이지 내용 출력
    for i, doc in enumerate(documents):
        print(f"\n[페이지 {i+1}]")
        print("-" * 80)
        print(doc.page_content[:])
        print(f"\n메타데이터: {doc.metadata}")
        print("-" * 80)

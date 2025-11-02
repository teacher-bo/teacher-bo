import json
from pathlib import Path
from typing import List
from langchain.schema import Document


class RulebookJSONLoader:
    """룰북 JSON 문서 로더 클래스"""

    def __init__(self, file_path: str):
        self.file_path = file_path

    def load_documents(self) -> List[Document]:
        """JSON 파일을 로드하여 LangChain Document 객체 리스트로 반환"""
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            documents = []
            for item in data:
                # content를 본문으로, 나머지를 메타데이터로
                doc = Document(
                    page_content=item.get('content', ''),
                    metadata={
                        'category': item.get('category', ''),
                        'keywords': item.get('keywords', []),
                        'source': item.get('source', ''),
                        'file_path': self.file_path
                    }
                )
                documents.append(doc)
            
            return documents
        
        except FileNotFoundError:
            print(f"❌ 파일을 찾을 수 없습니다: {self.file_path}")
            return []
        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 오류: {e}")
            return []
        except Exception as e:
            print(f"❌ 예상치 못한 오류: {e}")
            return []


# 테스트 코드
if __name__ == "__main__":
    json_path = "rulebooks/Sabotage_rulebook.json"

    print(f"JSON 로딩 중: {json_path}")
    print("=" * 80)

    loader = RulebookJSONLoader(json_path)
    documents = loader.load_documents()

    if documents:
        print(f"\n✅ 총 문서 수: {len(documents)}")
        print("=" * 80)

        # 처음 5개 문서만 출력
        for i, doc in enumerate(documents[:5]):
            print(f"\n[문서 {i+1}]")
            print("-" * 80)
            print(f"내용: {doc.page_content}")
            print(f"카테고리: {doc.metadata.get('category')}")
            print(f"키워드: {', '.join(doc.metadata.get('keywords', []))}")
            print(f"출처: {doc.metadata.get('source')}")
            print("-" * 80)
        
        if len(documents) > 5:
            print(f"\n... 외 {len(documents) - 5}개 문서")
    else:
        print("\n❌ 문서를 로드하지 못했습니다.")

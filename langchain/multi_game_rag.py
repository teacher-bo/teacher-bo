import json
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.messages import HumanMessage
from langchain_redis import RedisVectorStore
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
import redis
from typing import List, Dict, Optional

# 환경 변수 로드
load_dotenv(dotenv_path="../.env")

class MultiGameRAGSystem:
    def __init__(
        self,
        redis_url="redis://localhost:6379",
        base_index_name="game_rag",
        llm_provider=None,
    ):
        """
        다중 게임 RAG 시스템 초기화

        Args:
            redis_url: Redis 서버 URL
            base_index_name: 기본 인덱스 이름 (게임별로 확장됨)
            llm_provider: LLM 제공자 ('openai' 또는 'gemini')
        """
        self.redis_url = os.getenv("REDIS_URL", redis_url)
        self.base_index_name = base_index_name
        self.llm_provider = llm_provider or os.getenv("LLM_PROVIDER", "gemini").lower()
        
        # 게임별 설정
        self.games_config = {
            "sabotage": {
                "name": "사보타지",
                "rulebook_path": "./rag_documents/sabotage_rulebook.json",
                "description": "블러핑과 추리가 결합된 보드게임"
            },
            "rummikub": {
                "name": "루미큐브",
                "rulebook_path": "./rag_documents/rummikub_rulebook_gameonly.json",
                "description": "숫자 타일을 조합하는 전략 게임"
            }
            # 추후 게임 추가 시 여기에 추가
        }
        
        # 현재 선택된 게임 (기본값: sabotage)
        self.current_game = "sabotage"
        
        # LLM 및 임베딩 모델 초기화
        self._initialize_models()
        
        # 텍스트 분할기 초기화
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        
        # Redis 연결 테스트
        self._test_redis_connection()
        
        # 게임별 벡터 스토어 딕셔너리
        self.vectorstores = {}
        
    def _initialize_models(self):
        """LLM 및 임베딩 모델 초기화"""
        if self.llm_provider == "gemini":
            print("🤖 Gemini 2.0 Flash 모델을 사용합니다.")
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash-exp",
                temperature=0.7,
                google_api_key=os.getenv("GOOGLE_API_KEY"),
            )
            self.embeddings = GoogleGenerativeAIEmbeddings(
                model="models/text-embedding-004",
                google_api_key=os.getenv("GOOGLE_API_KEY"),
            )
        elif self.llm_provider == "openai":
            print("🤖 OpenAI GPT 모델을 사용합니다.")
            self.llm = ChatOpenAI(temperature=0.7, model="gpt-4o")
            self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        else:
            raise ValueError(f"지원하지 않는 LLM 제공자: {self.llm_provider}")

    def _test_redis_connection(self):
        """Redis 연결 테스트"""
        try:
            r = redis.from_url(self.redis_url)
            r.ping()
            print("✅ Redis 연결 성공!")
        except Exception as e:
            print(f"❌ Redis 연결 실패: {e}")
            raise

    def _get_game_index_name(self, game_id: str) -> str:
        """게임별 인덱스 이름 생성"""
        provider_suffix = "_openai" if self.llm_provider == "openai" else "_gemini"
        return f"{self.base_index_name}_{game_id}{provider_suffix}"

    def get_available_games(self) -> Dict[str, Dict]:
        """사용 가능한 게임 목록 반환"""
        return self.games_config

    def switch_game(self, game_id: str):
        """게임 전환"""
        if game_id not in self.games_config:
            raise ValueError(f"지원하지 않는 게임: {game_id}")
        
        self.current_game = game_id
        print(f"🎮 게임이 '{self.games_config[game_id]['name']}'로 전환되었습니다.")

    def initialize_game_vectorstore(self, game_id: str):
        """특정 게임의 벡터 스토어 초기화"""
        if game_id not in self.games_config:
            raise ValueError(f"지원하지 않는 게임: {game_id}")
        
        game_config = self.games_config[game_id]
        index_name = self._get_game_index_name(game_id)
        
        try:
            # 기존 인덱스 확인
            try:
                vectorstore = RedisVectorStore.from_existing_index(
                    embedding=self.embeddings,
                    index_name=index_name,
                    redis_url=self.redis_url,
                )
                vectorstore.similarity_search("테스트", k=1)
                self.vectorstores[game_id] = vectorstore
                print(f"✅ '{game_config['name']}' 기존 벡터 스토어 연결 완료")
                return
            except Exception:
                pass
            
            # 새 벡터 스토어 생성
            print(f"🔄 '{game_config['name']}' 새 벡터 스토어 생성 중...")
            
            # 기존 인덱스 삭제
            r = redis.from_url(self.redis_url)
            try:
                r.delete(index_name)
            except Exception:
                pass
            
            # 룰북 문서 로드
            documents = self._load_game_documents(game_id)
            
            if documents:
                # 문서를 청크로 분할
                texts = self.text_splitter.split_documents(documents)
                print(f"📄 {len(documents)}개 문서를 {len(texts)}개 청크로 분할")
                
                # 벡터 스토어 생성
                vectorstore = RedisVectorStore.from_documents(
                    texts,
                    self.embeddings,
                    index_name=index_name,
                    redis_url=self.redis_url,
                )
                self.vectorstores[game_id] = vectorstore
                print(f"✅ '{game_config['name']}' 벡터 스토어 생성 완료 ({len(texts)}개 청크)")
            else:
                # 빈 벡터 스토어 생성
                vectorstore = RedisVectorStore.from_texts(
                    texts=["초기화 샘플"],
                    embedding=self.embeddings,
                    index_name=index_name,
                    redis_url=self.redis_url,
                )
                self.vectorstores[game_id] = vectorstore
                print(f"⚠️ '{game_config['name']}' 룰북을 찾을 수 없어 빈 벡터 스토어 생성")
                
        except Exception as e:
            print(f"❌ '{game_config['name']}' 벡터 스토어 초기화 실패: {e}")
            raise

    def _load_game_documents(self, game_id: str) -> List[Document]:
        """게임 룰북 문서 로드"""
        game_config = self.games_config[game_id]
        rulebook_path = game_config["rulebook_path"]
        
        documents = []
        
        if os.path.exists(rulebook_path):
            try:
                with open(rulebook_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    
                for item in data:
                    content = item.get("content", "")
                    if content.strip():
                        metadata = {
                            "game": game_id,
                            "game_name": game_config["name"],
                            **{k: v for k, v in item.items() if k != "content"}
                        }
                        documents.append(Document(page_content=content, metadata=metadata))
                
                print(f"📖 '{game_config['name']}' 룰북에서 {len(documents)}개 문서 로드")
            except Exception as e:
                print(f"❌ '{game_config['name']}' 룰북 로드 실패: {e}")
        else:
            print(f"⚠️ '{game_config['name']}' 룰북 파일을 찾을 수 없음: {rulebook_path}")
            
        return documents

    def get_current_vectorstore(self):
        """현재 게임의 벡터 스토어 반환"""
        if self.current_game not in self.vectorstores:
            self.initialize_game_vectorstore(self.current_game)
        return self.vectorstores[self.current_game]

    def search_documents(self, query: str, k: int = 5, game_id: Optional[str] = None):
        """문서 검색 (특정 게임 또는 현재 게임)"""
        target_game = game_id or self.current_game
        
        if target_game not in self.vectorstores:
            self.initialize_game_vectorstore(target_game)
        
        try:
            results = self.vectorstores[target_game].similarity_search_with_score(query, k=k)
            game_name = self.games_config[target_game]["name"]
            print(f"🔍 '{game_name}'에서 '{query}' 검색: {len(results)}개 문서 발견")
            return results
        except Exception as e:
            print(f"❌ 문서 검색 실패: {e}")
            return []

    def generate_answer(self, question: str, k: int = 5, game_id: Optional[str] = None):
        """게임 규칙 질문 답변 생성"""
        target_game = game_id or self.current_game
        game_config = self.games_config[target_game]
        
        # 관련 문서 검색
        docs_with_scores = self.search_documents(question, k=k, game_id=target_game)
        
        if not docs_with_scores:
            return f"'{game_config['name']}' 관련 문서를 찾을 수 없습니다."
        
        # 컨텍스트 구성
        context_parts = []
        for i, (doc, score) in enumerate(docs_with_scores):
            context_part = f"[참고자료 {i+1}] (관련도: {score:.3f})\n{doc.page_content}"
            
            if doc.metadata:
                metadata_items = []
                for k, v in doc.metadata.items():
                    if k not in ['game', 'game_name']:  # 게임 정보는 제외
                        metadata_items.append(f"{k}: {v}")
                if metadata_items:
                    context_part += f"\n(출처: {', '.join(metadata_items)})"
            
            context_parts.append(context_part)
        
        context = "\n\n".join(context_parts)
        
        # 게임별 맞춤 프롬프트
        system_prompt = f"""당신은 '{game_config['name']}' 게임 규칙 전문가입니다.

게임 설명: {game_config['description']}

답변 지침:
1. 제공된 컨텍스트 정보를 우선적으로 활용하세요
2. '{game_config['name']}' 게임 규칙에만 집중하여 답변하세요
3. 규칙이 명확하지 않은 경우, 가능한 해석을 제시하세요
4. 참고자료 번호를 명시하여 근거를 제시하세요
5. 간결하고 정확하게 답변하세요"""

        user_prompt = f"""## 컨텍스트 정보:
{context}

## 질문:
{question}

위의 '{game_config['name']}' 룰북 정보를 바탕으로 질문에 답변해주세요."""

        try:
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            response = self.llm.invoke([HumanMessage(content=full_prompt)])
            
            print(f"\n[DEBUG] '{game_config['name']}' 검색 결과:")
            for i, (doc, score) in enumerate(docs_with_scores):
                print(f"  {i+1}. 관련도: {score:.3f}")
                if doc.metadata.get('category'):
                    print(f"     카테고리: {doc.metadata['category']}")
            
            return response.content
            
        except Exception as e:
            return f"답변 생성 중 오류: {e}"

    def get_system_info(self):
        """시스템 정보 조회"""
        print(f"🎮 다중 게임 RAG 시스템 정보")
        print(f"  - Redis URL: {self.redis_url}")
        print(f"  - LLM Provider: {self.llm_provider.upper()}")
        print(f"  - 현재 게임: {self.games_config[self.current_game]['name']}")
        print(f"  - 지원 게임 수: {len(self.games_config)}")
        
        print(f"\n📚 지원 게임 목록:")
        for game_id, config in self.games_config.items():
            status = "✅ 로드됨" if game_id in self.vectorstores else "⏳ 미로드"
            current_mark = "👉 " if game_id == self.current_game else "   "
            print(f"{current_mark}{config['name']} ({game_id}): {status}")
            print(f"      {config['description']}")
        
        # Redis 정보
        try:
            r = redis.from_url(self.redis_url)
            all_keys = r.keys("*")
            game_keys = [key for key in all_keys if self.base_index_name.encode() in key]
            print(f"\n💾 Redis 정보:")
            print(f"  - 전체 키 수: {len(all_keys)}")
            print(f"  - 게임 관련 키 수: {len(game_keys)}")
        except Exception as e:
            print(f"❌ Redis 정보 조회 실패: {e}")

    def clear_game_data(self, game_id: str):
        """특정 게임 데이터 삭제"""
        if game_id not in self.games_config:
            raise ValueError(f"지원하지 않는 게임: {game_id}")
        
        try:
            r = redis.from_url(self.redis_url)
            index_name = self._get_game_index_name(game_id)
            r.delete(index_name)
            
            if game_id in self.vectorstores:
                del self.vectorstores[game_id]
            
            game_name = self.games_config[game_id]["name"]
            print(f"✅ '{game_name}' 데이터가 삭제되었습니다.")
            
        except Exception as e:
            print(f"❌ 게임 데이터 삭제 실패: {e}")

    def initialize_all_games(self):
        """모든 게임의 벡터 스토어 초기화"""
        print("🔄 모든 게임 벡터 스토어 초기화 중...")
        
        for game_id in self.games_config.keys():
            try:
                print(f"\n--- {self.games_config[game_id]['name']} 초기화 ---")
                self.initialize_game_vectorstore(game_id)
            except Exception as e:
                print(f"❌ {self.games_config[game_id]['name']} 초기화 실패: {e}")
        
        print("\n✅ 모든 게임 초기화 완료!")

def main():
    """메인 함수"""
    try:
        print("=== 다중 게임 RAG 시스템 ===")
        
        # LLM 제공자 선택
        print("\n=== LLM 제공자 선택 ===")
        print("1. OpenAI (GPT-4o)")
        print("2. Google Gemini (2.0 Flash)")
        
        current_provider = os.getenv("LLM_PROVIDER", "gemini").lower()
        print(f"현재 환경변수: {current_provider.upper()}")
        
        choice = input("선택 (1/2, 엔터: 환경변수 사용): ").strip()
        provider = "openai" if choice == "1" else "gemini" if choice == "2" else current_provider
        
        # RAG 시스템 초기화
        rag = MultiGameRAGSystem(llm_provider=provider)
        
        # 시스템 정보 출력
        print("\n")
        rag.get_system_info()
        
        # 초기화 옵션
        print("\n=== 초기화 옵션 ===")
        print("1. 기존 데이터 사용")
        print("2. 현재 게임만 초기화")
        print("3. 모든 게임 초기화")
        print("4. 시스템 정보만 보기")
        
        init_choice = input("선택 (1-4, 기본값: 1): ").strip() or "1"
        
        if init_choice == "2":
            rag.initialize_game_vectorstore(rag.current_game)
        elif init_choice == "3":
            rag.initialize_all_games()
        elif init_choice == "4":
            return
        
        # 대화형 모드
        print(f"\n=== 대화형 모드 ===")
        print(f"현재 게임: {rag.games_config[rag.current_game]['name']}")
        print("명령어:")
        print("  - 게임 전환: /switch <game_id>")
        print("  - 게임 목록: /games")
        print("  - 시스템 정보: /info")
        print("  - 종료: /exit 또는 exit")
        
        while True:
            user_input = input(f"\n[{rag.games_config[rag.current_game]['name']}] 질문: ").strip()
            
            if user_input.lower() in ['exit', '/exit']:
                print("👋 시스템을 종료합니다.")
                break
            
            elif user_input.startswith('/switch '):
                game_id = user_input[8:].strip()
                try:
                    rag.switch_game(game_id)
                except ValueError as e:
                    print(f"❌ {e}")
                    print("사용 가능한 게임 ID:", list(rag.games_config.keys()))
            
            elif user_input == '/games':
                print("\n📚 지원 게임 목록:")
                for game_id, config in rag.games_config.items():
                    current_mark = "👉 " if game_id == rag.current_game else "   "
                    print(f"{current_mark}{config['name']} (ID: {game_id})")
                    print(f"      {config['description']}")
            
            elif user_input == '/info':
                print()
                rag.get_system_info()
            
            elif user_input:
                answer = rag.generate_answer(user_input)
                print(f"\n💬 답변: {answer}")
            
            else:
                print("⚠️ 질문을 입력하거나 명령어를 사용하세요.")
    
    except Exception as e:
        print(f"❌ 시스템 실행 중 오류: {e}")

if __name__ == "__main__":
    main()
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

# 환경 변수 로드
load_dotenv(dotenv_path="../.env")

rag_document_paths = [
    "./rag_documents/manual.json",
]


class RAGSystem:
    def __init__(
        self,
        redis_url="redis://localhost:6379",
        index_name="rag_index",
        llm_provider=None,
    ):
        """
        RAG 시스템 초기화

        Args:
            redis_url: Redis 서버 URL
            index_name: 벡터 인덱스 이름
            llm_provider: LLM 제공자 ('openai' 또는 'gemini'). None이면 환경변수에서 가져옴
        """
        self.redis_url = os.getenv("REDIS_URL", redis_url)
        self.index_name = index_name
        self.llm_provider = llm_provider or os.getenv("LLM_PROVIDER", "gemini").lower()

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

        # 벡터 스토어 초기화
        self.vectorstore = None
        self._initialize_vectorstore()

    def _initialize_models(self):
        """LLM 및 임베딩 모델 초기화"""
        if self.llm_provider == "gemini":
            print("🤖 Gemini 2.5 Flash 모델을 사용합니다.")
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash-exp",
                temperature=0.7,
                google_api_key=os.getenv("GOOGLE_API_KEY"),
            )
            # Gemini 임베딩 모델 사용
            self.embeddings = GoogleGenerativeAIEmbeddings(
                model="models/text-embedding-004",
                google_api_key=os.getenv("GOOGLE_API_KEY"),
            )
        elif self.llm_provider == "openai":
            print("🤖 OpenAI GPT 모델을 사용합니다.")
            self.llm = ChatOpenAI(temperature=0.7, model="gpt-4o")
            self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        else:
            raise ValueError(
                f"지원하지 않는 LLM 제공자입니다: {self.llm_provider}. 'openai' 또는 'gemini'를 사용하세요."
            )

    def _test_redis_connection(self):
        """Redis 연결 테스트"""
        try:
            r = redis.from_url(self.redis_url)
            r.ping()
            print("✅ Redis 연결 성공!")
        except Exception as e:
            print(f"❌ Redis 연결 실패: {e}")
            print("Redis 서버가 실행 중인지 확인해주세요.")
            raise

    def _initialize_vectorstore(self):
        """벡터 스토어 초기화"""
        try:
            # 임베딩 모델별로 다른 인덱스 이름 사용
            provider_suffix = "_openai" if self.llm_provider == "openai" else "_gemini"
            self.index_name = f"{self.index_name}{provider_suffix}"

            # Redis 연결 확인
            r = redis.from_url(self.redis_url)

            # 인덱스 존재 여부 확인
            index_exists = False
            try:
                # 기존 인덱스 확인 시도
                self.vectorstore = RedisVectorStore.from_existing_index(
                    embedding=self.embeddings,
                    index_name=self.index_name,
                    redis_url=self.redis_url,
                )
                # 간단한 검색으로 인덱스 유효성 확인
                self.vectorstore.similarity_search("테스트", k=1)
                index_exists = True
                print(f"기존 벡터 인덱스 '{self.index_name}' 사용")
            except Exception as e:
                print(f"기존 인덱스 사용 불가: {str(e)}")
                index_exists = False

            if not index_exists:
                print(f"새로운 벡터 인덱스 '{self.index_name}' 생성")
                # 기존 인덱스 삭제 (차원 불일치 문제 해결)
                try:
                    r.delete(self.index_name)
                except Exception:
                    pass

                # 새 인덱스 생성
                self.vectorstore = RedisVectorStore.from_texts(
                    texts=["초기화 샘플 텍스트"],
                    embedding=self.embeddings,
                    index_name=self.index_name,
                    redis_url=self.redis_url,
                )
                print("✅ 새로운 벡터 스토어 생성 완료!")
            else:
                print("✅ 기존 벡터 스토어 연결 완료!")

        except Exception as e:
            print(f"벡터 스토어 초기화 중 오류: {e}")
            # 오류 발생 시 새로 생성
            try:
                self.vectorstore = RedisVectorStore.from_texts(
                    texts=["초기화 샘플 텍스트"],
                    embedding=self.embeddings,
                    index_name=self.index_name,
                    redis_url=self.redis_url,
                )
                print("✅ 새로운 벡터 스토어 생성 완료!")
            except Exception as e2:
                print(f"벡터 스토어 생성 실패: {e2}")
                raise

    def add_documents(self, documents):
        """
        문서들을 벡터 스토어에 추가

        Args:
            documents: Document 객체들의 리스트
        """
        try:
            # 문서들을 청크로 분할
            texts = self.text_splitter.split_documents(documents)
            print(f"문서를 {len(texts)}개의 청크로 분할했습니다.")

            # 벡터 스토어에 추가
            self.vectorstore.add_documents(texts)
            print("✅ 문서들이 벡터 스토어에 추가되었습니다!")

        except Exception as e:
            print(f"문서 추가 중 오류: {e}")
            raise

    def add_texts(self, datas):
        """
        텍스트들을 벡터 스토어에 추가

        Args:
            texts: 텍스트 문자열들의 리스트
            metadatas: 메타데이터 딕셔너리들의 리스트 (선택사항)
        """
        try:
            # 텍스트를 Document 객체로 변환
            documents = []
            for i, d in enumerate(datas):
                meta = {
                    k: v
                    for k, v in d.items()
                    if k != "content" and k != "source_citations"
                }
                documents.append(Document(page_content=d["content"], metadata=meta))

            self.add_documents(documents)

        except Exception as e:
            print(f"텍스트 추가 중 오류: {e}")
            raise

    def search_similar_documents(self, query, k=3):
        """
        유사한 문서 검색

        Args:
            query: 검색 쿼리
            k: 반환할 문서 수

        Returns:
            유사한 문서들의 리스트
        """
        try:
            results = self.vectorstore.similarity_search(query, k=k)
            print(f"'{query}'에 대한 {len(results)}개의 유사 문서를 찾았습니다.")
            return results

        except Exception as e:
            print(f"문서 검색 중 오류: {e}")
            return []

    def search_with_scores(self, query, k=3):
        """
        점수와 함께 유사한 문서 검색

        Args:
            query: 검색 쿼리
            k: 반환할 문서 수

        Returns:
            (문서, 점수) 튜플들의 리스트
        """
        try:
            results = self.vectorstore.similarity_search_with_score(query, k=k)
            print(f"'{query}'에 대한 {len(results)}개의 유사 문서를 찾았습니다.")
            return results

        except Exception as e:
            print(f"문서 검색 중 오류: {e}")
            return []

    def generate_answer_with_rag(self, question, k=3, include_metadata=True):
        """
        RAG를 사용하여 질문에 답변 생성

        Args:
            question: 질문
            k: 검색할 문서 수
            include_metadata: 메타데이터 포함 여부

        Returns:
            AI가 생성한 답변
        """
        try:
            # 관련 문서 검색 (점수와 함께)
            relevant_docs_with_scores = self.search_with_scores(question, k=k)

            if not relevant_docs_with_scores:
                return "관련 문서를 찾을 수 없습니다."

            # 컨텍스트 구성 (점수 기반으로 정렬되어 있음)
            context_parts = []
            for i, (doc, score) in enumerate(relevant_docs_with_scores):
                # 관련도가 높은 순서대로 번호 매기기
                context_part = (
                    f"[참고자료 {i + 1}] (관련도: {score:.3f})\n{doc.page_content}"
                )

                # 메타데이터가 있다면 추가
                if include_metadata and doc.metadata:
                    metadata_str = ", ".join(
                        [f"{k}: {v}" for k, v in doc.metadata.items()]
                    )
                    context_part += f"\n(출처: {metadata_str})"

                context_parts.append(context_part)

            context = "\n\n" + "\n\n".join(context_parts) + "\n\n"

            # 향상된 프롬프트 구성
            prompt = f"""
당신은 '사보타지' 게임 규칙 전문가입니다. 다음 지침을 따라 답변해주세요:

## 컨텍스트 정보:
{context}

## 답변 지침:
0. 사용자는 '무조건' 사보타지 관련 질문만 할 것입니다
1. 위의 컨텍스트 정보를 우선적으로 활용하여 답변해주세요.
2. 관련도가 높은 참고자료를 우선적으로 참조해주세요.
3. 규칙이 명확하지 않은 경우, 가능한 해석을 제시해주세요.
4. 답변 시 참고한 자료 번호를 명시해주세요. (예: [참고자료 1] 기준으로...)
5. 간결하게, 한문장으로 답변하도록 해.

## 질문:
{question}

## 답변:"""

            # AI 모델로 답변 생성
            message = HumanMessage(content=prompt)
            response = self.llm.invoke([message])

            # 디버깅 정보 출력
            print(
                f"\n[DEBUG] 사용된 컨텍스트 ({len(relevant_docs_with_scores)}개 문서):"
            )
            for i, (doc, score) in enumerate(relevant_docs_with_scores):
                print(
                    f"  {i + 1}. 관련도: {score:.3f}, 길이: {len(doc.page_content)}자"
                )
                if doc.metadata:
                    print(f"     메타데이터: {doc.metadata}")

            return response.content

        except Exception as e:
            print(f"RAG 답변 생성 중 오류: {e}")
            return f"답변 생성 중 오류가 발생했습니다: {e}"

    def generate_answer_with_enhanced_context(
        self, question, k=3, similarity_threshold=0.7
    ):
        """
        향상된 컨텍스트를 사용하여 질문에 답변 생성

        Args:
            question: 질문
            k: 검색할 문서 수
            similarity_threshold: 유사도 임계값 (이 값 이상인 문서만 사용)

        Returns:
            AI가 생성한 답변
        """
        try:
            # 관련 문서 검색 (점수와 함께)
            relevant_docs_with_scores = self.search_with_scores(
                question, k=k * 2
            )  # 더 많이 검색해서 필터링

            if not relevant_docs_with_scores:
                return "관련 문서를 찾을 수 없습니다."

            # 유사도 임계값으로 필터링
            filtered_docs = [
                (doc, score)
                for doc, score in relevant_docs_with_scores
                if score >= similarity_threshold
            ]

            if not filtered_docs:
                # 임계값을 만족하는 문서가 없으면 상위 k개 사용
                filtered_docs = relevant_docs_with_scores[:k]
                print(
                    f"[INFO] 임계값 {similarity_threshold}을 만족하는 문서가 없어 상위 {k}개 문서를 사용합니다."
                )
            else:
                # 임계값을 만족하는 문서 중 상위 k개만 사용
                filtered_docs = filtered_docs[:k]

            # 컨텍스트 구성
            high_relevance_docs = [doc for doc, score in filtered_docs if score >= 0.8]
            medium_relevance_docs = [
                doc for doc, score in filtered_docs if 0.6 <= score < 0.8
            ]

            context_parts = []

            # 고관련도 문서들
            if high_relevance_docs:
                context_parts.append("## 핵심 관련 정보:")
                for i, doc in enumerate(high_relevance_docs):
                    score = next(score for d, score in filtered_docs if d == doc)
                    context_parts.append(f"### 핵심 자료 {i + 1} (관련도: {score:.3f})")
                    context_parts.append(doc.page_content)
                    if doc.metadata:
                        metadata_str = ", ".join(
                            [f"{k}: {v}" for k, v in doc.metadata.items()]
                        )
                        context_parts.append(f"*출처: {metadata_str}*")

            # 중관련도 문서들
            if medium_relevance_docs:
                context_parts.append("\n## 추가 참고 정보:")
                for i, doc in enumerate(medium_relevance_docs):
                    score = next(score for d, score in filtered_docs if d == doc)
                    context_parts.append(f"### 참고 자료 {i + 1} (관련도: {score:.3f})")
                    context_parts.append(doc.page_content)
                    if doc.metadata:
                        metadata_str = ", ".join(
                            [f"{k}: {v}" for k, v in doc.metadata.items()]
                        )
                        context_parts.append(f"*출처: {metadata_str}*")

            context = "\n\n".join(context_parts)

            # System message와 User message로 분리하여 더 명확한 지시
            system_prompt = """당신은 '사보타지' 게임 규칙 전문가입니다. 다음 지침을 따라 답변해주세요:

0. 사용자는 '무조건' 사보타지 관련 질문만 할 것입니다
1. 제공된 컨텍스트 정보를 우선적으로 활용하세요
2. 핵심 관련 정보를 우선적으로 참조하세요
3. 규칙이 명확하지 않거나 여러 해석이 가능한 경우, 가능한 시나리오들을 설명하세요
4. 답변의 근거가 되는 정보의 관련도를 고려하여 확신의 정도를 표현하세요"""

            user_prompt = f"""## 컨텍스트 정보:
{context}

## 사용자 질문:
{question}

위의 컨텍스트를 바탕으로 질문에 대한 정확하고 도움이 되는 답변을 제공해주세요."""

            # AI 모델로 답변 생성 (시스템 메시지와 유저 메시지 결합)
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            response = self.llm.invoke([HumanMessage(content=full_prompt)])

            # 디버깅 정보 출력
            print("\n[DEBUG] 향상된 컨텍스트 사용:")
            print(f"  - 총 검색 문서: {len(relevant_docs_with_scores)}개")
            print(f"  - 임계값 필터링 후: {len(filtered_docs)}개")
            print(f"  - 고관련도 문서: {len(high_relevance_docs)}개")
            print(f"  - 중관련도 문서: {len(medium_relevance_docs)}개")

            return response.content

        except Exception as e:
            print(f"향상된 RAG 답변 생성 중 오류: {e}")
            return f"답변 생성 중 오류가 발생했습니다: {e}"

    def clear_vectorstore(self):
        """벡터 스토어 초기화"""
        try:
            r = redis.from_url(self.redis_url)
            # 현재 제공자에 맞는 인덱스 이름 생성
            provider_suffix = "_openai" if self.llm_provider == "openai" else "_gemini"
            current_index_name = f"rag_index{provider_suffix}"

            r.delete(current_index_name)
            print(f"✅ 벡터 인덱스 '{current_index_name}'가 삭제되었습니다.")

            # 새로 초기화
            self._initialize_vectorstore()

        except Exception as e:
            print(f"❌ 벡터 스토어 초기화 중 오류: {e}")

    def flush_redis_data(self):
        """Redis 전체 데이터 flush (모든 데이터 삭제)"""
        try:
            r = redis.from_url(self.redis_url)
            r.flushall()
            print("✅ Redis 전체 데이터가 삭제되었습니다.")

            # 벡터 스토어 재초기화
            print("🔄 벡터 스토어를 재초기화합니다...")
            self._initialize_vectorstore()

        except Exception as e:
            print(f"❌ Redis 데이터 flush 중 오류: {e}")

    def init_vectorstore_with_documents(self):
        """벡터 스토어 초기화 후 문서들 자동 로드"""
        try:
            print("🔄 벡터 스토어 초기화 중...")
            self.clear_vectorstore()

            print("📖 문서들을 로드하고 벡터 스토어에 추가 중...")
            sample_datas = []
            for path in rag_document_paths:
                if os.path.exists(path):
                    with open(path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        sample_datas.extend(data)
                        print(f"  - {path}: {len(data)}개 문서 로드")
                else:
                    print(f"⚠️ 파일을 찾을 수 없습니다: {path}")

            if sample_datas:
                self.add_texts(sample_datas)
                print(
                    f"✅ 총 {len(sample_datas)}개 문서가 벡터 스토어에 추가되었습니다!"
                )
            else:
                print("⚠️ 로드할 문서가 없습니다.")

        except Exception as e:
            print(f"❌ 벡터 스토어 초기화 및 문서 로드 중 오류: {e}")

    def get_vectorstore_info(self):
        """벡터 스토어 정보 조회"""
        try:
            r = redis.from_url(self.redis_url)

            # 인덱스 정보 조회
            provider_suffix = "_openai" if self.llm_provider == "openai" else "_gemini"
            current_index_name = f"rag_index{provider_suffix}"

            print(f"📊 벡터 스토어 정보 ({current_index_name}):")
            print(f"  - Redis URL: {self.redis_url}")
            print(f"  - LLM Provider: {self.llm_provider.upper()}")
            print(f"  - 인덱스 이름: {current_index_name}")

            # Redis 키 개수 확인
            all_keys = r.keys("*")
            print(f"  - 총 Redis 키 개수: {len(all_keys)}")

            # 벡터 스토어 관련 키 확인
            vector_keys = [
                key for key in all_keys if current_index_name.encode() in key
            ]
            print(f"  - 벡터 스토어 관련 키: {len(vector_keys)}")

            if vector_keys:
                print("  - 관련 키 목록:")
                for key in vector_keys[:5]:  # 처음 5개만 표시
                    print(f"    * {key.decode('utf-8')}")
                if len(vector_keys) > 5:
                    print(f"    ... 및 {len(vector_keys) - 5}개 더")

        except Exception as e:
            print(f"❌ 벡터 스토어 정보 조회 중 오류: {e}")


def create_rag_system_with_provider_selection():
    """사용자가 LLM 제공자를 선택할 수 있도록 하는 헬퍼 함수"""
    print("=== LLM 제공자 선택 ===")
    print("1. OpenAI (GPT-4o-mini)")
    print("2. Google Gemini (2.5 Flash)")

    current_provider = os.getenv("LLM_PROVIDER", "openai").lower()
    print(f"현재 환경변수 설정: {current_provider.upper()}")

    choice = input("사용할 LLM을 선택하세요 (1 또는 2, 엔터: 환경변수 사용): ").strip()

    if choice == "1":
        provider = "openai"
    elif choice == "2":
        provider = "gemini"
    else:
        provider = current_provider

    return RAGSystem(llm_provider=provider)


def main():
    """메인 함수 - RAG 시스템 테스트"""
    try:
        print("=== 보드게임 RAG 시스템 ===")

        # 사용자가 LLM 제공자를 선택할 수 있도록 함
        rag = create_rag_system_with_provider_selection()

        print("-" * 50)
        print("=== 초기화 옵션 ===")
        print("1: 기존 데이터 사용")
        print("2: 벡터 스토어만 초기화 (현재 LLM 제공자)")
        print("3: Redis 전체 데이터 flush (모든 데이터 삭제)")
        print("4: 벡터 스토어 정보 조회")
        print("5: 벡터 스토어 초기화 + 문서 자동 로드")

        init_choice = input("선택하세요 (1-5, 기본값: 1): ").strip() or "1"

        if init_choice == "2":
            print("\n🔄 벡터 스토어 초기화 중...")
            rag.clear_vectorstore()
        elif init_choice == "3":
            confirm = (
                input("\n⚠️ Redis 전체 데이터를 삭제하시겠습니까? (y/N): ")
                .strip()
                .lower()
            )
            if confirm == "y":
                rag.flush_redis_data()
            else:
                print("취소되었습니다.")
        elif init_choice == "4":
            print("\n📊 벡터 스토어 정보:")
            rag.get_vectorstore_info()
        elif init_choice == "5":
            rag.init_vectorstore_with_documents()
        else:
            print("기존 데이터를 사용합니다.")

        print("-" * 50)

        # 문서 추가 옵션 (1번 또는 5번이 아닌 경우에만)
        if init_choice not in ["1", "5"]:
            add_docs = input("\n문서를 추가하시겠습니까? (y/N): ").strip().lower()
            if add_docs == "y":
                print("샘플 문서들을 벡터 스토어에 추가합니다...")
                sample_datas = []
                for path in rag_document_paths:
                    if os.path.exists(path):
                        with open(path, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            sample_datas.extend(data)
                    else:
                        print(f"⚠️ 파일을 찾을 수 없습니다: {path}")

                if sample_datas:
                    rag.add_texts(sample_datas)

        # 질문과 답변 테스트
        questions = ["내 손에 들려있는 카드는 몇장을 유지해야 할까?"]

        # 테스트 질문 실행 여부
        run_test = input("\n테스트 질문을 실행하시겠습니까? (y/N): ").strip().lower()
        if run_test == "y":
            print("\n=== 기본 RAG 테스트 ===")
            for question in questions[:1]:  # 첫 번째 질문만 테스트
                print(f"\n질문: {question}")
                answer = rag.generate_answer_with_rag(question)
                print(f"답변: {answer}")
                print("-" * 50)

            print("\n=== 향상된 RAG 테스트 ===")
            for question in questions[:1]:  # 첫 번째 질문만 테스트
                print(f"\n질문: {question}")
                answer = rag.generate_answer_with_enhanced_context(question)
                print(f"답변: {answer}")
                print("-" * 50)

        # get questions from stdin
        print("\n=== 대화형 모드 ===")
        print("사용할 방법을 선택하세요:")
        print("1: 기본 RAG")
        print("2: 향상된 RAG")
        method_choice = input("선택 (1 또는 2, 기본값: 2): ").strip() or "2"

        print(f"\n🤖 사용 중인 모델: {rag.llm_provider.upper()}")
        if rag.llm_provider == "gemini":
            print("   - LLM: Gemini 2.5 Flash")
            print("   - 임베딩: Text Embedding 004")
        else:
            print("   - LLM: GPT-4o-mini")
            print("   - 임베딩: Text Embedding 3 Small")

        while True:
            user_input = input("\n질문을 입력하세요 (종료하려면 'exit' 입력): ")
            if user_input.lower() == "exit":
                break

            if method_choice == "1":
                answer = rag.generate_answer_with_rag(user_input)
            else:
                answer = rag.generate_answer_with_enhanced_context(user_input)

            print(f"답변: {answer}")
            print("-" * 50)

    except Exception as e:
        print(f"메인 함수 실행 중 오류: {e}")
        print("환경 변수 설정을 확인해주세요:")
        if os.getenv("LLM_PROVIDER", "openai").lower() == "gemini":
            print("- GOOGLE_API_KEY가 설정되어 있는지 확인")
        else:
            print("- OPENAI_API_KEY가 설정되어 있는지 확인")


if __name__ == "__main__":
    main()

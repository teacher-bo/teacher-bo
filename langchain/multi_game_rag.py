import os, json, time, hashlib
from typing import List, Dict, Optional, Tuple
from dotenv import load_dotenv
import redis

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_redis import RedisVectorStore
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 환경 변수 로드
load_dotenv(dotenv_path="../.env")

class MultiGameRAGSystem:
    def __init__(
        self,
        redis_url: str = None,
        base_index_name: str = "game_rag",
        llm_provider: Optional[str] = None,
    ):
        self.redis_url = os.getenv("REDIS_URL", redis_url or "redis://localhost:6379")
        self.base_index_name = base_index_name
        self.llm_provider = (llm_provider or os.getenv("LLM_PROVIDER", "openai")).lower()

        # 게임별 설정
        self.games_config = {
            "sabotage": {
                "name": "사보타지",
                "rulebook_path": "./rag_documents/sabotage_rulebook.json",
                "description": "광부 vs 방해꾼 정체 숨김 팀게임",
            },
            # 필요 시 계속 추가 가능
        }
        self.current_game = "sabotage"

        self._initialize_models()
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=120)
        self.vectorstores: Dict[str, RedisVectorStore] = {}
        self.active_index_names: Dict[str, str] = {}
        self.conversation_history: List[Tuple[str, str]] = []

        self._test_redis()

    def _initialize_models(self):
        if self.llm_provider == "openai":
            self.llm = ChatOpenAI(model="gpt-5", temperature=0.25)
            self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        elif self.llm_provider == "gemini":
            self.llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-exp", temperature=0.2)
            self.embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
        else:
            raise ValueError(f"지원하지 않는 LLM_PROVIDER: {self.llm_provider}")

    def _test_redis(self):
        try:
            redis.from_url(self.redis_url).ping()
            print("✅ Redis 연결 성공!")
        except Exception as e:
            raise RuntimeError(f"Redis 연결 실패: {e}")

    def _get_base_index_name(self, game_id: str) -> str:
        suffix = "_openai" if self.llm_provider == "openai" else "_gemini"
        return f"{self.base_index_name}_{game_id}{suffix}"

    def _checksum(self, path: str) -> Optional[str]:
        try:
            with open(path, "rb") as f:
                return hashlib.sha256(f.read()).hexdigest()
        except Exception:
            return None

    def _load_game_documents(self, game_id: str) -> List[Document]:
        cfg = self.games_config[game_id]
        path = cfg["rulebook_path"]
        docs: List[Document] = []
        total = loaded = dropped = 0

        if not os.path.exists(path):
            print(f"⚠️ 파일 없음: {path}")
            return docs

        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for item in data:
                total += 1
                content = item.get("content", "")
                if not isinstance(content, str) or not content.strip():
                    dropped += 1
                    print(f"⚠️ content 누락/빈값 → 스킵 (source={item.get('source')}, category={item.get('category')})")
                    continue
                metadata = {
                    "game": game_id,
                    "game_name": cfg["name"],
                    **{k: v for k, v in item.items() if k != "content"},
                }
                docs.append(Document(page_content=content.strip(), metadata=metadata))
                loaded += 1
            print(f"📖 '{cfg['name']}' 로드 요약: 총 {total} / 적재 {loaded} / 스킵 {dropped}")
            return docs
        except Exception as e:
            print(f"❌ 룰북 로드 실패: {e}")
            return docs

    def initialize_game_vectorstore(self, game_id: str, force_reindex: bool = False):
        cfg = self.games_config[game_id]
        base = self._get_base_index_name(game_id)
        cs = self._checksum(cfg["rulebook_path"])
        version = f"ts{int(time.time())}" if (force_reindex or not cs) else cs[:8]
        index_name = f"{base}_{version}"
        self.active_index_names[game_id] = index_name

        # 기존 인덱스 재사용 시도
        try:
            vs = RedisVectorStore.from_existing_index(
                embedding=self.embeddings,
                index_name=index_name,
                redis_url=self.redis_url,
            )
            vs.similarity_search("ping", k=1)
            self.vectorstores[game_id] = vs
            print(f"✅ '{cfg['name']}' 기존 인덱스 연결 ({index_name})")
            return
        except Exception:
            pass

        # 새 인덱스 생성
        print(f"🔄 '{cfg['name']}' 인덱스 생성 중... ({index_name})")
        docs = self._load_game_documents(game_id)
        if not docs:
            vs = RedisVectorStore.from_texts(
                texts=["빈 인덱스 초기화"],
                embedding=self.embeddings,
                index_name=index_name,
                redis_url=self.redis_url,
            )
            self.vectorstores[game_id] = vs
            print(f"⚠️ 문서 없음 → 더미 인덱스 생성")
            return

        chunks = self.text_splitter.split_documents(docs)
        print(f"📦 {len(docs)}개 문서를 {len(chunks)}개 청크로 분할")
        vs = RedisVectorStore.from_documents(
            chunks,
            self.embeddings,
            index_name=index_name,
            redis_url=self.redis_url,
        )
        self.vectorstores[game_id] = vs
        print(f"✅ 인덱스 생성 완료 ({index_name})")

    def get_vectorstore(self, game_id: Optional[str] = None) -> RedisVectorStore:
        gid = game_id or self.current_game
        if gid not in self.vectorstores:
            self.initialize_game_vectorstore(gid)
        return self.vectorstores[gid]

    def _expand_query(self, q: str) -> str:
        # 간단한 한국어 동의어/표현 확장 (분배표 질문 보정)
        expansions = []
        if "광부" in q and ("전부" in q or "모두" in q or "다" in q):
            expansions += ["전원 광부", "모두 광부", "사보타지 최소 인원", "방해꾼 최소 1명", "역할 카드 배분표"]
        if "인원" in q or "참여" in q:
            expansions += ["플레이어 수", "인원별 분배", "역할 카드 개수", "게임 준비 분배표"]
        if not expansions:
            return q
        return q + " | " + " | ".join(expansions)

    def search_documents(self, query: str, k: int = 10, game_id: Optional[str] = None):
        gid = game_id or self.current_game
        vs = self.get_vectorstore(gid)

        expanded = self._expand_query(query)
        results = vs.similarity_search_with_score(expanded, k=k)

        # 간단 부스팅: 분배표/역할/준비 관련 키워드가 많을수록 상위
        boost_keywords = ["역할", "분배", "참여", "인원", "역할 카드", "준비", "배분표", "방해꾼", "광부"]
        def boost_score(doc: Document, score: float) -> float:
            text = (doc.page_content or "") + " " + " ".join(doc.metadata.get("keywords", []))
            hits = sum(1 for kw in boost_keywords if kw in text)
            # 점수가 낮을수록 유사도↑인 구현도 있어 안전하게 보정치 빼기
            return score - hits * 0.05

        results = sorted(results, key=lambda x: boost_score(x[0], x[1]))
        return results

    def generate_answer(self, question: str, k: int = 10, game_id: Optional[str] = None) -> str:
        gid = game_id or self.current_game
        cfg = self.games_config[gid]
        docs = self.search_documents(question, k=k, game_id=gid)
        if not docs:
            return "관련 문서를 찾지 못했습니다."

        # 컨텍스트와 출처
        context_parts = []
        for i, (doc, score) in enumerate(docs, start=1):
            src = doc.metadata.get("source", "출처 미상")
            cat = doc.metadata.get("category", "카테고리 미상")
            context_parts.append(f"[{i}] ({cat} · {src})\n{doc.page_content}")
        context = "\n\n".join(context_parts[:6])

        system_prompt = (
            f"당신은 '{cfg['name']}' 보드게임 룰북 전문가입니다.\n"
            "- 질문과 매칭되는 내용이 있다면 그것을 근거로 답변하세요."
            "- 질문과 매칭되는 내용이 없어도 제공된 룰북 컨텍스트로 추론이 가능하다면 추론 후, 근거를 제시하세요."
            "- 추론이 불가능하다면 '룰북 근거 없음'이라고 답하세요.\n"
            "- 답변은 한국어로, '예', '아니오'를 먼저 답한 후, 근거를 답변하세요.\n"
            "- 근거는 해당 문장을 그대로 출력하세요.\n"
        )

        user_prompt = (
            f"[질문]\n{question}\n\n"
            f"[컨텍스트]\n{context}\n\n"
            "[요청]\n"
            "- 답변과 근거 문장만 깔끔하게 출력\n"
            "- 마지막 줄에 근거로 [번호]를 나열"
        )

        try:
            resp = self.llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ]).content
        except Exception as e:
            return f"답변 생성 중 오류: {e}"

        # 전체 출처 문자열 (언패킹 수정)
        sources = "\n".join(
            f"- [{i}] {doc.metadata.get('category','')}, {doc.metadata.get('source','')}"
            for i, (doc, _) in enumerate(docs, start=1)
        )

        return f"{resp}\n\n참고 자료:\n{sources}"

    def get_system_info(self):
        print("🎮 시스템 정보")
        print(f"- Redis: {self.redis_url}")
        print(f"- LLM: {self.llm_provider.upper()}")
        print(f"- 현재 게임: {self.games_config[self.current_game]['name']}")
        for gid, cfg in self.games_config.items():
            mark = "👉" if gid == self.current_game else "  "
            idx = self.active_index_names.get(gid, "(미생성)")
            print(f"{mark} {cfg['name']} ({gid}) index: {idx}")

def main():
    print("=== 다중 게임 RAG 시스템 ===")
    provider = os.getenv("LLM_PROVIDER", "openai").lower()
    choice = input("LLM 선택 (1: OpenAI, 2: Gemini, 엔터: 환경변수 사용): ").strip()
    if choice == "1": provider = "openai"
    elif choice == "2": provider = "gemini"

    rag = MultiGameRAGSystem(llm_provider=provider)
    rag.initialize_game_vectorstore("sabotage")  # 최초 초기화

    print("\n명령어: /reindex, /info, /exit")
    while True:
        q = input(f"\n[사보타지] 질문: ").strip()
        if not q: 
            print("질문을 입력하세요.")
            continue
        if q in ("/exit", "exit"): 
            print("종료합니다."); break
        if q == "/info":
            rag.get_system_info(); continue
        if q == "/reindex":
            print("🔄 강제 재인덱스 중...")
            rag.initialize_game_vectorstore("sabotage", force_reindex=True)
            continue

        answer = rag.generate_answer(q, k=12)
        print(f"\n💬 답변: {answer}")

if __name__ == "__main__":
    main()
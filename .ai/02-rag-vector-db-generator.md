# RAG Vector DB Generator

## ⚠️ 필수 요구사항
- **rulebooks/ 폴더 내 파일은 용량이 크므로 절대 전체를 읽지 말것**
- 파일명만 확인 필요 시 `ls` 명령어 사용
- PDF/JSON 파일 내용은 loaders를 통해서만 접근

## 목적
보드게임 룰북을 벡터 데이터베이스(ChromaDB)로 변환하는 임베딩 생성기

## 기술 스택
- LangChain, Upstage Solar Embeddings, ChromaDB, PDFPlumber

## 폴더 구조

```
rag-vector-db-generator/
├── embed_and_store.py       # 메인 스크립트: 룰북 임베딩 & ChromaDB 저장
├── loaders/                 # 문서 로더
│   ├── pdf_loader.py        # PDF 로더 (PDFPlumber 사용)
│   └── json_loader.py       # JSON 로더 (구조화된 룰북)
├── rulebooks/               # 원본 룰북 파일 (PDF, JSON, TXT)
├── requirements.txt
└── .env                     # API 키 환경 변수
```

## 주요 기능

### embed_and_store.py
1. 텍스트 파일 로드 (rulebooks/*.txt)
2. 마크다운 헤더로 1차 분할
3. RecursiveCharacterTextSplitter로 2차 분할 (chunk_size=1000)
4. Upstage Solar Embeddings로 임베딩 생성
5. ChromaDB에 저장 (cosine similarity)
6. 테스트 검색 수행

### 로더
- **pdf_loader.py**: PDF 파일을 LangChain Document로 변환
- **json_loader.py**: 구조화된 JSON 룰북을 Document로 변환 (카테고리, 키워드 메타데이터 포함)

## 실행
```bash
python embed_and_store.py
```

## 출력
생성된 벡터 DB는 `../rag-server/chroma_db/sabotage/`에 저장됨

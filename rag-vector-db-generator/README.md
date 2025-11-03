# RAG Vector DB Generator

게임 룰북을 PDF로부터 처리하여 ChromaDB 벡터 스토어로 변환하는 파이프라인

## 📁 폴더 구조

```
rag-vector-db-generator/
├── rulebooks/
│   ├── target-pdf/           # PDF 파일 저장 위치 (사용자가 제공)
│   │   ├── by-ocr/          # OCR이 필요한 PDF
│   │   └── by-text/         # 텍스트 추출 가능한 PDF
│   ├── target-text/         # 1차 가공 결과 (자동 생성)
│   ├── final/               # LLM으로 정제된 최종 텍스트 (자동 생성)
│   └── sabotage_rulebook.txt # 참조 포맷 (삭제하지 마세요)
├── loaders/
│   ├── pdf_loader.py        # 일반 PDF 로더
│   └── pdf_ocr_loader.py    # OCR PDF 로더
├── tools/
│   └── text-to-markdown-by-llm.py  # (deprecated: process_rulebooks.py로 통합됨)
├── process_rulebooks.py     # PDF → Final 텍스트 처리
├── embed_and_store.py       # Final 텍스트 → ChromaDB
└── chroma_db/               # ChromaDB 저장소 (자동 생성)
```

## 🚀 사용 방법

### 1. PDF 파일 준비

게임 룰북 PDF를 다음 규칙에 따라 저장:

- **파일명 형식**: `{게임명}.rulebook.pdf`
- **저장 위치**:
  - OCR이 필요한 경우: `rulebooks/target-pdf/by-ocr/`
  - 텍스트 추출 가능한 경우: `rulebooks/target-pdf/by-text/`

예시:
```
rulebooks/target-pdf/by-ocr/sabotage.rulebook.pdf
rulebooks/target-pdf/by-text/rummikub.rulebook.pdf
```

### 2. PDF → 최종 텍스트 처리

```bash
python process_rulebooks.py
```

이 스크립트는:
1. `target-text/`와 `final/` 폴더를 초기화
2. `target-pdf/` 폴더의 모든 PDF를 탐지
3. PDF → 텍스트 추출 (OCR 또는 일반 추출)
4. LLM을 사용하여 마크다운 형식으로 정제
5. 결과를 `rulebooks/final/{게임명}.rulebook.txt`로 저장

### 3. 임베딩 및 ChromaDB 저장

```bash
python embed_and_store.py
```

이 스크립트는:
1. `rulebooks/final/` 폴더의 모든 `.rulebook.txt` 파일 탐지
2. 각 파일을 청크로 분할
3. Upstage Solar Embeddings로 임베딩
4. ChromaDB에 저장 (`chroma_db/{게임명}/`)

## 🔧 환경 변수 설정

`.env` 파일에 다음 키 설정 필요:

```env
UPSTAGE_API_KEY=your_upstage_api_key
OPENAI_API_KEY=your_openai_api_key
```

## 📝 처리 흐름

```
PDF 파일
  ↓
[target-pdf/by-ocr 또는 by-text]
  ↓
process_rulebooks.py
  ↓
[target-text/{게임명}.rulebook_text.txt]  (1차 가공)
  ↓
LLM 정제
  ↓
[final/{게임명}.rulebook.txt]  (최종)
  ↓
embed_and_store.py
  ↓
[chroma_db/{게임명}/]
```

## 🎯 새 게임 추가하기

1. PDF 파일을 `rulebooks/target-pdf/by-ocr/` 또는 `by-text/`에 `{게임명}.rulebook.pdf` 형식으로 저장
2. `python process_rulebooks.py` 실행
3. `python embed_and_store.py` 실행

완료! 새 게임의 벡터 DB가 `chroma_db/{게임명}/`에 생성됩니다.

## ⚠️ 주의사항

- `rulebooks/sabotage_rulebook.txt`는 참조 포맷으로 사용되므로 삭제하지 마세요
- `process_rulebooks.py`는 실행 시마다 `target-text/`와 `final/` 폴더를 초기화합니다
- `target-pdf/` 폴더의 PDF 파일만 유지하면 됩니다

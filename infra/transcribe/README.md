# Infra - Amazon Transcribe

## 참고 DOCS

https://docs.aws.amazon.com/ko_kr/transcribe/latest/dg/vocabulary-filter-create.html

## 목적

Amazon Transcribe Custom Vocabulary Filter를 GitHub Actions로 자동 관리

## 위치

`/infra/transcribe/`

## 파일 구조

```
infra/
└── transcribe/
    ├── vocabulary-filter.txt  # Custom Vocabulary 단어 목록 (TSV 형식)
    └── README.md              # 사용 가이드
```

## 파일 설명

- `vocabulary-filter.txt`: Amazon Transcribe에서 사용할 커스텀 단어 목록
  - 보드게임 용어, 고유명사 등 포함

## Vocabulary Filter 형식

TSV(Tab-Separated Values) 형식:

| Phrase   | SoundsLike | IPA | DisplayAs |
| -------- | ---------- | --- | --------- |
| 사보타지 |            |     | 사보타지  |
| 싸보타지 |            |     | 사보타지  |
| 보세요   |            |     | 보쌤      |

- **Phrase**: 인식될 원본 단어
- **SoundsLike**: 발음 유사어 (선택)
- **IPA**: 국제 음성 기호 (선택)
- **DisplayAs**: 실제 표시될 단어

## 자동 배포 워크플로우

**Trigger**: `infra/transcribe/vocabulary-filter.txt` 파일 변경

**GitHub Actions**: `.github/workflows/sync-transcribe-vocabulary.yml`

**프로세스**:

1. 파일 변경 감지
2. S3 업로드: `s3://teacher-bo-amazon-transcribe-voca-filter/vocabulary-filter.txt`
3. Transcribe Vocabulary Filter 업데이트/생성
4. 상태 확인 (최대 5분 대기)

## 필요한 GitHub Secrets

- `STT_AWS_ACCESS_KEY_ID`
- `STT_AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

## 사용 방법

1. `vocabulary-filter.txt` 파일 수정
2. Git commit & push
3. GitHub Actions가 자동으로 배포
4. Transcribe API 호출 시 `VocabularyFilterName: "teacher-bo-vocabulary-filter"` 사용

## 클라이언트 사용 예시

Transcribe API 호출 시:

```javascript
const params = {
  LanguageCode: "ko-KR",
  Media: { MediaFileUri: "s3://bucket/audio.mp3" },
  VocabularyFilterName: "teacher-bo-vocabulary-filter",
  VocabularyFilterMethod: "mask", // 또는 'remove', 'tag'
};
```

## 주의사항

- Vocabulary Filter는 생성/업데이트 후 처리 시간이 필요 (보통 1-3분)
- 최대 단어 수: 50,000개
- 파일 크기: 최대 50KB

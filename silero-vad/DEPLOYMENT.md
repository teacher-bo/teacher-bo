# Silero VAD 배포 가이드

Elastic Beanstalk로 Silero VAD 서버 배포 자동화

## 필요한 GitHub Secrets

다음의 GitHub Secrets를 설정해야 합니다:

### Silero VAD 배포 관련

- `VAD_SERVER_AWS_ACCESS_KEY_ID`: AWS Access Key ID
- `VAD_SERVER_AWS_SECRET_ACCESS_KEY`: AWS Secret Access Key
- `VAD_SERVER_S3_BUCKET`: 배포 파일을 저장할 S3 버킷 이름
- `VAD_SERVER_EB_APPLICATION_NAME`: Elastic Beanstalk 애플리케이션 이름
- `VAD_SERVER_EB_ENVIRONMENT_NAME`: Elastic Beanstalk 환경 이름
- `VAD_SERVER_ENV`: `.env` 파일 내용 (환경 변수)

## 배포 방법

### 자동 배포

`silero-vad/` 폴더의 파일이 변경되고 `main` 브랜치에 push되면 자동으로 배포됩니다.

### 수동 배포

GitHub Actions의 "Actions" 탭에서 "Deploy Silero VAD to Elastic Beanstalk" 워크플로우를 수동으로 실행할 수 있습니다.

## 배포 프로세스

1. Python 3.13 환경 설정
2. AWS 자격 증명 구성
3. 환경 변수 파일 생성
4. 배포 패키지 생성 (소스 코드 + 종속성)
5. S3에 업로드
6. Elastic Beanstalk 애플리케이션 버전 생성
7. Elastic Beanstalk 환경에 배포
8. Health check 수행

## 로컬 테스트

```bash
cd silero-vad
pipenv shell
pipenv install
pipenv run python main.py
```

서버는 포트 1003에서 실행됩니다.

## Elastic Beanstalk 설정

### 플랫폼

- Python 3.13

### 인스턴스 타입

- t3.medium (메모리: 4GB)

### 환경 변수

`.env` 파일을 통해 설정됩니다.

## API 엔드포인트

배포 후 Health check 엔드포인트:

- `http://{CNAME}/` (FastAPI 기본 경로)

VAD 엔드포인트:

- `POST http://{CNAME}/detect`

## 문제 해결

### 배포 실패 시

1. GitHub Actions 로그 확인
2. Elastic Beanstalk 콘솔에서 환경 로그 확인
3. CloudWatch Logs 확인

### Health check 실패 시

- 포트 설정 확인 (8000)
- Procfile 확인
- 애플리케이션 로그 확인

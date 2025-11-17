# Server 배포 가이드

Elastic Beanstalk로 NestJS 서버 배포 자동화

## 필요한 GitHub Secrets

다음의 GitHub Secrets를 설정해야 합니다:

### Server 배포 관련

- `MAIN_SERVER_AWS_ACCESS_KEY_ID`: AWS Access Key ID
- `MAIN_SERVER_AWS_SECRET_ACCESS_KEY`: AWS Secret Access Key
- `MAIN_SERVER_S3_BUCKET`: 배포 파일을 저장할 S3 버킷 이름
- `MAIN_SERVER_EB_APPLICATION_NAME`: Elastic Beanstalk 애플리케이션 이름
- `MAIN_SERVER_EB_ENVIRONMENT_NAME`: Elastic Beanstalk 환경 이름
- `MAIN_SERVER_ENV`: `.env` 파일 내용 (환경 변수)

## 배포 방법

### 자동 배포

`server/` 폴더의 파일이 변경되고 `main` 브랜치에 push되면 자동으로 배포됩니다.

### 수동 배포

GitHub Actions의 "Actions" 탭에서 "Deploy Server to Elastic Beanstalk" 워크플로우를 수동으로 실행할 수 있습니다.

## 배포 프로세스

1. Node.js 20 환경 설정
2. 의존성 설치 (`yarn install`)
3. Prisma Client 생성 (`yarn db:generate`)
4. 애플리케이션 빌드 (`yarn build`)
5. 환경 변수 파일 생성
6. 배포 패키지 생성 (dist, node_modules, prisma 등)
7. S3에 업로드
8. Elastic Beanstalk 애플리케이션 버전 생성
9. Elastic Beanstalk 환경에 배포
10. Health check 수행

## 로컬 테스트

```bash
cd server
yarn install
yarn db:generate
yarn build
yarn start:prod
```

서버는 포트 1002에서 실행됩니다.

## Elastic Beanstalk 설정

### 플랫폼

- Node.js 20

### 인스턴스 타입

- t3.medium (메모리: 4GB)

### 환경 변수

`.env` 파일을 통해 설정됩니다.

필수 환경 변수:

- `DATABASE_URL`: MySQL 데이터베이스 연결 문자열
- `JWT_SECRET`: JWT 토큰 시크릿 키
- `JWT_EXPIRES_IN`: JWT 토큰 만료 시간
- `PORT`: 서버 포트 (기본값: 8080)
- `NODE_ENV`: 환경 (production)
- `CLIENT_URL`: 클라이언트 URL
- `RAG_SERVER_URL`: RAG 서버 URL

## API 엔드포인트

배포 후 Health check 엔드포인트:

- `http://{CNAME}/` (NestJS 기본 경로)

GraphQL 엔드포인트:

- `http://{CNAME}/api/graphql`

## 데이터베이스 마이그레이션

배포 전에 로컬에서 마이그레이션을 실행하고 확인해야 합니다:

```bash
yarn db:migrate
```

프로덕션 데이터베이스에 직접 마이그레이션이 필요한 경우:

```bash
DATABASE_URL="프로덕션_DB_URL" yarn db:migrate
```

## 문제 해결

### 배포 실패 시

1. GitHub Actions 로그 확인
2. Elastic Beanstalk 콘솔에서 환경 로그 확인
3. CloudWatch Logs 확인

### Health check 실패 시

- 포트 설정 확인 (8080)
- Procfile 확인
- 애플리케이션 로그 확인
- 데이터베이스 연결 확인

### Prisma 관련 문제

- Prisma Client가 제대로 생성되었는지 확인
- DATABASE_URL 환경 변수 확인
- 마이그레이션 상태 확인

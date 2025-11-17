#!/bin/bash
set -xe

echo "[HOOK] prebuild TMPDIR hook running" >> /var/log/tmpr-hook.log

# 1) EB 환경변수 파일(AL2/AL2023 기준)에 TMPDIR 주입
DEPLOY_ENV="/opt/elasticbeanstalk/deployment/env"

# 파일/디렉토리 없으면 만들어 줌
mkdir -p "$(dirname "$DEPLOY_ENV")"
touch "$DEPLOY_ENV"

# 기존 TMPDIR 줄은 제거하고
grep -v '^TMPDIR=' "$DEPLOY_ENV" > "${DEPLOY_ENV}.tmp" || true
mv "${DEPLOY_ENV}.tmp" "$DEPLOY_ENV"

# 새 TMPDIR 추가
echo "TMPDIR=/var/tmp" >> "$DEPLOY_ENV"

# 2) 혹시 이후 훅에서 바로 pip 쓸 수도 있으니 현재 셸에도 반영
export TMPDIR=/var/tmp

# 3) 확인용 로그
echo "TMPDIR set to /var/tmp" >> /var/log/tmpr-hook.log
ls -ld /var/tmp >> /var/log/tmpr-hook.log
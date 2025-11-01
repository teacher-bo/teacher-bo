#!/bin/bash

# Elastic Beanstalk 배포 파일 압축 스크립트

echo "Creating deploy.zip for Elastic Beanstalk..."

# deploy.zip 생성 경로 설정 (teacher-bo 폴더 아래)
DEPLOY_ZIP="../deploy.zip"

# 기존 deploy.zip 삭제
if [ -f "$DEPLOY_ZIP" ]; then
    rm "$DEPLOY_ZIP"
    echo "Removed existing deploy.zip"
fi

# 필요한 파일들을 압축 (.env, chroma_db 포함)
zip -r "$DEPLOY_ZIP" \
    application.py \
    requirements.txt \
    Procfile \
    app/ \
    chroma_db/ \
    .ebextensions/ \
    .ebignore \
    .env \
    -x "*.pyc" \
    -x "__pycache__/*" \
    -x "app/__pycache__/*" \
    -x "*.DS_Store" \
    -x "venv/*"

echo "✅ deploy.zip created successfully at ../deploy.zip (teacher-bo folder)"
echo "Files included:"
unzip -l "$DEPLOY_ZIP"

## Mac Python 세팅

```bash
brew install python@3.12
```

## 가상 환경 세팅

```bash
python3.12 -m venv venv

source venv/bin/activate # 가상환경 활성화
deactivate               # 사용 종료
```

## 라이브러리 설치

```bash
pip install -r requirements.txt
```

## 서버 시작하기

```bash
fastapi dev app/main.py
```

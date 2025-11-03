# 새로운 게임 추가 메뉴얼

1. 새로운 game rulebook PDF를 ./rulebooks/target-pdf/{by-ocr, by-text} 폴더에 추가
- 이때 파일명은 {새로운 게임 이름 ENG}.rulebook.pdf 형식으로 추가

2. 새로운 game rulebook PDF를 모두 추가한 후, 다음 명령어를 실행

```bash
python process_rulebooks.py
```

3. ./rulebooks/final-rulebook 폴더에 추가된 txt 파일 확인

4. embed_and_store.py 파일을 실행하여 벡터 데이터베이스 생성

```bash
python embed_and_store.py
```

5. 벡터 데이터베이스 생성 후, chroma_db 폴더를 rag-server 폴더에 복사

```bash
cp -r chroma_db ../rag-server/
```

6. rag-server 폴더의 ./app/config/games.py 파일에 새로운 게임 정보 추가

```json
{
    "name": "{새로운 게임 이름 KR}",
    "db_path": "./chroma_db/{새로운 게임 이름 ENG}",
    "collection": "{새로운 게임 이름 ENG}_rulebook"
}
```

7. 새로운 게임 추가 완료

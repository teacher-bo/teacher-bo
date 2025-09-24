1. python 3.13이 필요하다.
2. pipenv라는 파이썬 가상환경 관리자가 필요하다.
3. langchain 폴더 안에서 pipenv shell을 입력하면 우리의 파이썬 가상환경으로 진입한다.
4. pipenv install을 입력하여 이 가상환경 안에 dependency들을 설치한다.
5. pipenv run python3 ./rag_system.py 를 실행할 수 있다.
6. 그런데 우리는 VectorDB로 redis-stack을 사용하고 있다.
7. 먼저 .env.example 파일을 참고하여 .env 파일을 생성해주자.
8. 루트 디렉토리에 있는 docker-compose.yml 파일을 docker compose up -d 명령어를 통해 실행하면 redis-stack이 실행된다.

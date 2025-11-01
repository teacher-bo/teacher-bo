from app.main import app

# Elastic Beanstalk는 'application' 변수를 찾습니다
application = app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(application, host="0.0.0.0", port=8000)

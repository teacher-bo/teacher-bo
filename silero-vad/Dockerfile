
FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TMPDIR=/var/tmp \
    PIPENV_VENV_IN_PROJECT=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Runtime dependencies for torchaudio and friends
RUN apt-get update \
    && apt-get install -y --no-install-recommends libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first to leverage Docker layer cache
COPY Pipfile Pipfile.lock ./
RUN pip install --upgrade pip pipenv \
    && TMPDIR=/var/tmp pipenv install --system --deploy

# Copy application source
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

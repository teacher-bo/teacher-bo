# Silero VAD Server

Voice Activity Detection (VAD) server using Silero VAD model.

## Features

- Real-time voice activity detection
- FastAPI-based REST API
- Streaming audio support
- Port: 1003

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
pipenv shell
pipenv install
pipenv run python main.py
```

## API Endpoints

### POST /detect

Detect voice activity in audio stream.

**Request:**

- Content-Type: `multipart/form-data`
- Body: `audio` file (PCM 16kHz mono)

**Response:**

```json
{
  "has_speech": true,
  "speech_ended": false,
  "confidence": 0.95
}
```

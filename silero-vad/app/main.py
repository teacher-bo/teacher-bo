"""
FastAPI application for Silero VAD service
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
from app.vad_service import SileroVAD

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Silero VAD API",
    description="Voice Activity Detection using Silero VAD",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize VAD service
vad_service = SileroVAD(sample_rate=16000)


class VADResponse(BaseModel):
    """VAD detection response model"""

    has_speech: bool
    speech_ended: bool
    confidence: float


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"service": "Silero VAD API", "status": "running", "version": "1.0.0"}


@app.post("/detect", response_model=VADResponse)
async def detect_voice_activity(audio: UploadFile = File(...)):
    """
    Detect voice activity in audio chunk

    Args:
        audio: Audio file (PCM 16kHz mono, 16-bit)

    Returns:
        VADResponse with detection results
    """
    try:
        # Read audio data
        audio_data = await audio.read()

        if len(audio_data) == 0:
            raise HTTPException(status_code=400, detail="Empty audio data")

        # Process audio chunk
        has_speech, speech_ended, confidence = vad_service.process_audio_chunk(
            audio_data
        )

        logger.info(
            f"VAD Result - Speech: {has_speech}, "
            f"Ended: {speech_ended}, "
            f"Confidence: {confidence:.3f}"
        )

        return VADResponse(
            has_speech=has_speech, speech_ended=speech_ended, confidence=confidence
        )

    except Exception as e:
        logger.error(f"Error in VAD detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reset")
async def reset_vad_state():
    """
    Reset VAD state

    Returns:
        Success message
    """
    try:
        vad_service.reset_state()
        return {"message": "VAD state reset successfully"}
    except Exception as e:
        logger.error(f"Error resetting VAD state: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=1003, reload=True)

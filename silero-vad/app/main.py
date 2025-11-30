"""
FastAPI application for Silero VAD service
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
from app.vad_service import SileroVAD
from typing import Dict, Optional
from datetime import datetime, timedelta

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


# Session-based VAD management
class VADSessionManager:
    """Manages VAD instances per session"""

    def __init__(self, session_timeout_minutes: int = 30):
        self.sessions: Dict[str, SileroVAD] = {}
        self.last_activity: Dict[str, datetime] = {}
        self.session_timeout = timedelta(minutes=session_timeout_minutes)

    def get_or_create_session(self, session_id: str) -> SileroVAD:
        """Get existing session or create new one"""
        if session_id not in self.sessions:
            logger.info(f"Creating new VAD session: {session_id}")
            self.sessions[session_id] = SileroVAD(sample_rate=16000)

        # Update last activity
        self.last_activity[session_id] = datetime.now()
        return self.sessions[session_id]

    def reset_session(self, session_id: str) -> bool:
        """Reset specific session state"""
        if session_id in self.sessions:
            logger.info(f"Resetting VAD session: {session_id}")
            self.sessions[session_id].reset_state()
            return True
        return False

    def remove_session(self, session_id: str) -> bool:
        """Remove specific session"""
        if session_id in self.sessions:
            logger.info(f"Removing VAD session: {session_id}")
            self.sessions.pop(session_id, None)
            self.last_activity.pop(session_id, None)
            return True
        return False

    def cleanup_inactive_sessions(self):
        """Remove sessions that have been inactive for too long"""
        now = datetime.now()
        inactive_sessions = [
            sid
            for sid, last_time in self.last_activity.items()
            if now - last_time > self.session_timeout
        ]

        for session_id in inactive_sessions:
            logger.info(f"Cleaning up inactive session: {session_id}")
            self.remove_session(session_id)

        return len(inactive_sessions)

    def get_session_count(self) -> int:
        """Get number of active sessions"""
        return len(self.sessions)


# Initialize VAD session manager
vad_manager = VADSessionManager(session_timeout_minutes=30)


class VADResponse(BaseModel):
    """VAD detection response model"""

    has_speech: bool
    speech_ended: bool
    confidence: float


class HealthResponse(BaseModel):
    """Health check response model"""

    status: str
    service: str
    version: str
    vad_model: str
    sample_rate: int
    active_sessions: int


@app.get("/")
async def root():
    """Root endpoint"""
    return {"service": "Silero VAD API", "status": "running", "version": "1.0.0"}


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint with detailed status"""
    # Cleanup inactive sessions on health check
    vad_manager.cleanup_inactive_sessions()

    return HealthResponse(
        status="healthy",
        service="Silero VAD API",
        version="1.0.0",
        vad_model="silero_vad",
        sample_rate=16000,
        active_sessions=vad_manager.get_session_count(),
    )


@app.post("/detect", response_model=VADResponse)
async def detect_voice_activity(
    audio: UploadFile = File(...), session_id: Optional[str] = Form(None)
):
    """
    Detect voice activity in audio chunk

    Args:
        audio: Audio file (PCM 16kHz mono, 16-bit)
        session_id: Session identifier (required for multi-user support)

    Returns:
        VADResponse with detection results
    """
    try:
        # Validate session_id
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id is required")

        # Read audio data
        audio_data = await audio.read()

        if len(audio_data) == 0:
            raise HTTPException(status_code=400, detail="Empty audio data")

        # Get or create session-specific VAD service
        vad_service = vad_manager.get_or_create_session(session_id)

        # Process audio chunk
        has_speech, speech_ended, confidence = vad_service.process_audio_chunk(
            audio_data
        )

        logger.info(
            f"VAD Result [Session: {session_id}] - Speech: {has_speech}, "
            f"Ended: {speech_ended}, "
            f"Confidence: {confidence:.3f}"
        )

        return VADResponse(
            has_speech=has_speech, speech_ended=speech_ended, confidence=confidence
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in VAD detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reset")
async def reset_vad_state(session_id: str = Query(...)):
    """
    Reset VAD state for a specific session

    Args:
        session_id: Session identifier

    Returns:
        Success message
    """
    try:
        if vad_manager.reset_session(session_id):
            return {
                "message": f"VAD state reset successfully for session: {session_id}"
            }
        else:
            raise HTTPException(
                status_code=404, detail=f"Session not found: {session_id}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting VAD state: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/session/{session_id}")
async def remove_session(session_id: str):
    """
    Remove a specific session

    Args:
        session_id: Session identifier

    Returns:
        Success message
    """
    try:
        if vad_manager.remove_session(session_id):
            return {"message": f"Session removed successfully: {session_id}"}
        else:
            raise HTTPException(
                status_code=404, detail=f"Session not found: {session_id}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=1003, reload=True)

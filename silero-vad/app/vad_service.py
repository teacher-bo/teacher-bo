"""
Silero VAD Service
Handles voice activity detection using Silero VAD model
"""

import torch
import numpy as np
from typing import Tuple
import logging
from silero_vad import load_silero_vad

logger = logging.getLogger(__name__)


class SileroVAD:
    def __init__(self, sample_rate: int = 16000):
        """
        Initialize Silero VAD model

        Args:
            sample_rate: Audio sample rate (default: 16000)
        """
        self.sample_rate = sample_rate
        self.model = None
        self.load_model()

        # VAD state management
        self.speech_started = False
        self.silence_frames = 0
        self.silence_threshold = 100  # Number of silent frames to consider speech ended

        # Audio buffer management
        self.audio_buffer = np.array([], dtype=np.float32)
        self.chunk_size = 512  # Exact chunk size required by Silero VAD (16kHz)

    def load_model(self):
        """Load Silero VAD model"""
        try:
            logger.info("Loading Silero VAD model...")
            self.model = load_silero_vad(onnx=False)
            logger.info("Silero VAD model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Silero VAD model: {e}")
            raise

    def process_audio_chunk(self, audio_data: bytes) -> Tuple[bool, bool, float]:
        """
        Process audio chunk and detect voice activity

        Args:
            audio_data: Raw PCM audio data (16-bit, mono)

        Returns:
            Tuple of (has_speech, speech_ended, confidence)
        """
        try:
            # Convert bytes to numpy array (int16)
            audio_np = np.frombuffer(audio_data, dtype=np.int16)

            if audio_np.size == 0:
                logger.debug("Received empty audio chunk, ignoring.")
                return False, False, 0.0

            # Normalize to [-1, 1]
            audio_float = audio_np.astype(np.float32) / 32768.0

            # Add to buffer
            self.audio_buffer = np.concatenate([self.audio_buffer, audio_float])

            has_speech = False
            speech_ended = False
            speech_prob = 0.0
            processed = False

            # Process every full chunk available to stay in sync with the stream
            while len(self.audio_buffer) >= self.chunk_size:
                processed = True
                audio_chunk = self.audio_buffer[: self.chunk_size]
                self.audio_buffer = self.audio_buffer[self.chunk_size :]

                audio_tensor = torch.from_numpy(audio_chunk)

                with torch.no_grad():
                    speech_prob = float(self.model(audio_tensor, self.sample_rate))

                has_speech = speech_prob > 0.5

                if has_speech:
                    if not self.speech_started:
                        self.speech_started = True
                        logger.info("Speech started")
                    self.silence_frames = 0
                else:
                    if self.speech_started:
                        self.silence_frames += 1
                        logger.debug(
                            "Silence frames: %s / %s",
                            self.silence_frames,
                            self.silence_threshold,
                        )
                        if self.silence_frames >= self.silence_threshold:
                            speech_ended = True
                            self.speech_started = False
                            logger.info(
                                "Speech ended, silence frames: %s",
                                self.silence_frames,
                            )
                            self.silence_frames = 0

            if not processed:
                logger.debug(
                    "Buffer too small: %s < %s, accumulating...",
                    len(self.audio_buffer),
                    self.chunk_size,
                )
                return False, False, 0.0

            return has_speech, speech_ended, speech_prob

        except Exception as e:
            logger.error(f"Error processing audio chunk: {e}")
            # Clear buffer on error
            self.audio_buffer = np.array([], dtype=np.float32)
            raise

    def reset_state(self):
        """Reset VAD state"""
        self.speech_started = False
        self.silence_frames = 0
        self.audio_buffer = np.array([], dtype=np.float32)
        logger.info("VAD state reset")

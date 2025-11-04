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
        self.silence_threshold = 12  # Number of silent frames to consider speech ended

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

            # Normalize to [-1, 1]
            audio_float = audio_np.astype(np.float32) / 32768.0

            # Add to buffer
            self.audio_buffer = np.concatenate([self.audio_buffer, audio_float])

            # Process only if we have enough samples
            if len(self.audio_buffer) < self.chunk_size:
                logger.debug(
                    f"Buffer too small: {len(self.audio_buffer)} < {self.chunk_size}, accumulating..."
                )
                return False, False, 0.0

            # Take exactly chunk_size samples
            audio_chunk = self.audio_buffer[: self.chunk_size]

            # Keep remaining samples in buffer
            self.audio_buffer = self.audio_buffer[self.chunk_size :]

            # Convert to torch tensor
            audio_tensor = torch.from_numpy(audio_chunk)

            # Get VAD prediction
            speech_prob = self.model(audio_tensor, self.sample_rate).item()

            # Determine voice activity (threshold: 0.5)
            print(speech_prob)
            has_speech = speech_prob > 0.5
            speech_ended = False

            # Track speech state
            if has_speech:
                if not self.speech_started:
                    self.speech_started = True
                    logger.info("Speech started")
                self.silence_frames = 0
            else:
                if self.speech_started:
                    self.silence_frames += 1
                    print(
                        f"Silence frames: {self.silence_frames}, Threshold: {self.silence_threshold}"
                    )
                    if self.silence_frames >= self.silence_threshold:
                        speech_ended = True
                        self.speech_started = False
                        self.silence_frames = 0
                        logger.info("Speech ended")

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

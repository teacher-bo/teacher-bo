import { useEffect, useState, useCallback, useRef } from "react";
import {
  ExpoAudioStreamModule,
  AudioDataEvent,
  useAudioRecorder,
} from "@siteed/expo-audio-studio";
import { useSocket } from "./useSocket";
import { ENV } from "../utils/env";
import type {
  UseWakeWordOptions,
  UseWakeWordReturn,
} from "./useWakeWord.types";

export const useWakeWord = (
  onWakeWordDetected: () => void,
  options: UseWakeWordOptions = {
    wakeWords: ["보쌤"],
    language: "ko-KR",
    sensitivity: 0.8,
    continuous: true,
  }
): UseWakeWordReturn => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startRecording: startRecordingWeb, stopRecording: stopRecordingWeb } =
    useAudioRecorder();

  const onAudioDataRef = useRef<(event: AudioDataEvent) => Promise<void>>(
    async () => {}
  );

  // 웨이크워드 감지 함수
  const checkForWakeWords = useCallback(
    (transcript: string) => {
      const normalizedTranscript = transcript.toLowerCase().trim();
      const hasWakeWord = options.wakeWords.some((wakeWord) =>
        normalizedTranscript.includes(wakeWord.toLowerCase())
      );

      if (hasWakeWord) {
        console.log("Wake word detected:", normalizedTranscript);
        onWakeWordDetected();
      }
    },
    [options.wakeWords, onWakeWordDetected]
  );

  const { sendAudioChunk, stopTranscriptionStream, connect, disconnect } =
    useSocket({
      vad: false,
      socketUrl: ENV.API_BASE_URL,
      onTranscriptionResult: (data) => {
        console.log("Transcription result:", data.text);
        checkForWakeWords(data.text);
      },
      onTranscriptionError: (error) => {
        console.error("Transcription error:", error);
        setError(`Transcription error: ${error.message || error}`);
      },
      onConnect: () => {
        console.log("Socket connected for wake word detection");
      },
    });

  // Setup audio data handler for web
  const setupAudioDataHandler = useCallback(() => {
    onAudioDataRef.current = async (event: AudioDataEvent): Promise<void> => {
      try {
        const { data: d, eventDataSize } = event;
        const data = d as any;

        if (!eventDataSize || eventDataSize === 0) return;

        if (typeof data === "string") {
          sendAudioChunk(data, 0);
        } else if (data instanceof Float32Array) {
          // Float32Array를 PCM 16-bit로 변환 후 Base64 인코딩
          const pcmData = new Int16Array(data.length);
          for (let i = 0; i < data.length; i++) {
            const sample = Math.max(-1, Math.min(1, data[i]));
            pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          }

          const uint8Array = new Uint8Array(pcmData.buffer);
          const base64String = btoa(String.fromCharCode(...uint8Array));
          sendAudioChunk(base64String, 0);
        } else if (data instanceof Int16Array) {
          const uint8Array = new Uint8Array(data.buffer);
          const base64String = btoa(String.fromCharCode(...uint8Array));
          sendAudioChunk(base64String, 0);
        }
      } catch (error) {
        console.error("Error processing audio data:", error);
      }
      return Promise.resolve();
    };
  }, [sendAudioChunk]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  const startListening = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      console.log("Starting wake word detection on web...");
      const { granted } = await ExpoAudioStreamModule.requestPermissionsAsync();
      if (!granted) {
        throw new Error("Microphone permission not granted");
      }

      setupAudioDataHandler();

      await startRecordingWeb({
        sampleRate: 16000,
        onAudioStream: (event: AudioDataEvent): Promise<void> =>
          onAudioDataRef.current(event),
      });

      setIsListening(true);
      console.log("Web wake word detection started");
    } catch (error: any) {
      console.error("Failed to start listening:", error);
      setError(error.message || "Failed to start voice recognition");
      setIsListening(false);
    }
  }, [setupAudioDataHandler, startRecordingWeb]);

  const stopListening = useCallback(async (): Promise<void> => {
    try {
      console.log("🛑 Stopping web wake word detection");

      stopTranscriptionStream();
      await stopRecordingWeb();
      console.log("Web wake word detection stopped");

      setIsListening(false);
    } catch (error: any) {
      console.error("Failed to stop listening:", error);
      setError(error.message || "Failed to stop voice recognition");
    }
  }, [stopTranscriptionStream, stopRecordingWeb]);

  return {
    isListening,
    startListening,
    stopListening,
    error,
  };
};

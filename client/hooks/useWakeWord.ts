import { useEffect, useState, useCallback, useRef } from "react";
import { Platform } from "react-native";

import {
  ExpoAudioStreamModule,
  AudioDataEvent,
  useAudioRecorder,
} from "@siteed/expo-audio-studio";
import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
  ExpoSpeechRecognitionOptions,
} from "expo-speech-recognition";
import { useSocket } from "./useSocket";
import { ENV } from "../utils/env";

interface UseWakeWordOptions {
  wakeWords: string[];
  language?: string;
  sensitivity?: number; // 0-1, web에서만 사용
  continuous?: boolean; // web에서만 사용
}

interface UseWakeWordReturn {
  isListening: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  error: string | null;
}

// Web Speech Recognition 타입 정의
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: any;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: any) => any) | null;
  onnomatch:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any)
    | null;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any)
    | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

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

  // Web audio recording
  const { startRecording: startRecordingWeb, stopRecording: stopRecordingWeb } =
    useAudioRecorder();

  // Web Speech Recognition 인스턴스 저장
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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

  const shouldContinueRef = useRef(false);

  const startRecognition = useCallback(async () => {
    const config: ExpoSpeechRecognitionOptions = {
      lang: options.language || "ko-KR",
      interimResults: true,
      maxAlternatives: 1,
      continuous: true,
      requiresOnDeviceRecognition: false,
      addsPunctuation: false,
      contextualStrings: options.wakeWords,
    };

    if (Platform.OS === "android") {
      config.androidIntentOptions = {
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
        EXTRA_MASK_OFFENSIVE_WORDS: false,
      };
    }

    if (Platform.OS === "ios") {
      config.iosCategory = {
        category: "playAndRecord",
        categoryOptions: [
          "defaultToSpeaker",
          "allowBluetooth",
          "mixWithOthers",
        ],
        mode: "spokenAudio",
      };
    }

    ExpoSpeechRecognitionModule.start(config);
  }, [options.language, options.wakeWords]);

  useSpeechRecognitionEvent("start", () => {
    if (Platform.OS !== "web") {
      setIsListening(true);
      setError(null);
    }
  });

  useSpeechRecognitionEvent("end", () => {
    if (Platform.OS !== "web") {
      setIsListening(false);

      if (shouldContinueRef.current) {
        setTimeout(async () => {
          if (!shouldContinueRef.current) return;

          try {
            await startRecognition();
          } catch (err) {
            console.error("Failed to restart speech recognition:", err);
            shouldContinueRef.current = false;
          }
        }, 500);
      }
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (Platform.OS !== "web") {
      const errorType = event.error || "unknown";
      const silentErrors = ["no-speech", "aborted"];
      const criticalErrors = ["audio-capture", "not-allowed"];

      if (silentErrors.includes(errorType)) {
        console.debug(
          `Speech recognition: ${errorType} (will retry if active)`
        );
      } else {
        console.error("Speech recognition error:", event);
      }

      if (criticalErrors.includes(errorType)) {
        shouldContinueRef.current = false;
        if (errorType === "audio-capture") {
          setError("마이크 접근 오류가 발생했습니다. 앱을 재시작해주세요.");
        } else if (errorType === "not-allowed") {
          setError("마이크 권한이 거부되었습니다.");
        }
      } else if (!silentErrors.includes(errorType)) {
        setError(`음성 인식 오류: ${errorType}`);
      }

      setIsListening(false);

      if (shouldContinueRef.current && silentErrors.includes(errorType)) {
        setTimeout(async () => {
          if (!shouldContinueRef.current) return;

          try {
            await startRecognition();
          } catch (err) {
            console.error("Failed to restart after error:", err);
            shouldContinueRef.current = false;
          }
        }, 1000);
      }
    }
  });

  useSpeechRecognitionEvent("result", (event) => {
    if (Platform.OS !== "web") {
      const results = event.results;
      if (results && results.length > 0) {
        const transcript = results.map((result) => result.transcript).join(" ");
        checkForWakeWords(transcript);
      }
    }
  });

  // Web platform: use Socket.IO to send audio to server for transcription
  const onAudioDataRef = useRef<(event: AudioDataEvent) => Promise<void>>(
    async () => {}
  );

  const { sendAudioChunk, stopTranscriptionStream, connect, disconnect } =
    useSocket({
      vad: true,
      socketUrl: ENV.API_BASE_URL,
      onTranscriptionResult: (data) => {
        if (Platform.OS === "web") {
          console.log("Transcription result:", data.text);
          checkForWakeWords(data.text);
        }
      },
      onTranscriptionError: (error) => {
        console.error("Transcription error:", error);
        if (Platform.OS === "web") {
          setError(`Transcription error: ${error.message || error}`);
        }
      },
      onConnect: () => {
        console.log("Socket connected for wake word detection");
      },
    });

  // Setup audio data handler for web
  const setupAudioDataHandler = useCallback(() => {
    onAudioDataRef.current = async (event: AudioDataEvent): Promise<void> => {
      try {
        const { data, eventDataSize } = event;

        if (!eventDataSize || eventDataSize === 0) return;

        if (data instanceof Int16Array) {
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
    if (Platform.OS === "web") {
      connect();
      return () => {
        disconnect();
      };
    }
  }, []);

  const startListening = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      shouldContinueRef.current = true;

      if (Platform.OS === "web") {
        console.log("Starting wake word detection on web...");
        const { granted } =
          await ExpoAudioStreamModule.requestPermissionsAsync();
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
      } else {
        const result =
          await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
          throw new Error("Speech recognition permission not granted");
        }

        console.log("✅ Speech recognition starting with continuous mode");

        const config: any = {
          lang: options.language || "ko-KR",
          interimResults: true,
          maxAlternatives: 1,
          continuous: options.continuous !== false,
          requiresOnDeviceRecognition: false,
          addsPunctuation: false,
          contextualStrings: options.wakeWords,
        };

        if (Platform.OS === "android") {
          config.androidIntentOptions = {
            EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
            EXTRA_MASK_OFFENSIVE_WORDS: false,
          };
        }

        if (Platform.OS === "ios") {
          config.iosCategory = {
            category: "playAndRecord",
            categoryOptions: [
              "defaultToSpeaker",
              "allowBluetooth",
              "mixWithOthers",
            ],
            mode: "spokenAudio",
          };
        }

        ExpoSpeechRecognitionModule.start(config);
      }
    } catch (error: any) {
      console.error("Failed to start listening:", error);
      setError(error.message || "Failed to start voice recognition");
      setIsListening(false);
      shouldContinueRef.current = false;
    }
  }, [options.language, options.continuous, options.wakeWords]);

  const stopListening = useCallback(async (): Promise<void> => {
    try {
      console.log(
        "🛑 Stopping speech recognition, setting shouldContinue = false"
      );
      shouldContinueRef.current = false; // continuous 모드 비활성화

      if (Platform.OS === "web") {
        stopTranscriptionStream();
        await stopRecordingWeb();
        console.log("Web wake word detection stopped");
      } else {
        await ExpoSpeechRecognitionModule.stop();
        console.log("✅ Speech recognition stopped");
      }

      setIsListening(false);
    } catch (error: any) {
      console.error("Failed to stop listening:", error);
      setError(error.message || "Failed to stop voice recognition");
    }
  }, []);

  return {
    isListening,
    startListening,
    stopListening,
    error,
  };
};

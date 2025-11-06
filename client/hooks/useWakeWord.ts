import { useEffect, useState, useCallback, useRef } from "react";
import { Platform } from "react-native";

import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
} from "expo-speech-recognition";

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

  // expo-speech-recognition 이벤트 핸들러 (iOS/Android)
  useSpeechRecognitionEvent("start", () => {
    if (Platform.OS !== "web") {
      console.log("Speech: Recognition started");
      setIsListening(true);
      setError(null);
    }
  });

  useSpeechRecognitionEvent("end", () => {
    if (Platform.OS !== "web") {
      console.log("Speech: Recognition ended");
      setIsListening(false);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (Platform.OS !== "web") {
      console.error("Speech: Recognition error", event);
      setError(event.error || "Speech recognition error");
      setIsListening(false);
    }
  });

  useSpeechRecognitionEvent("result", (event) => {
    if (Platform.OS !== "web") {
      const results = event.results;
      if (results && results.length > 0) {
        const transcript = results.map((result) => result.transcript).join(" ");
        console.log("Speech: Result:", transcript);
        checkForWakeWords(transcript);
      }
    }
  });

  // Web Speech Recognition 설정
  useEffect(() => {
    if (Platform.OS === "web") {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognitionAPI) {
        if (!recognitionRef.current) {
          recognitionRef.current = new SpeechRecognitionAPI();
        }

        const recognition = recognitionRef.current;
        recognition.continuous = options.continuous || true;
        recognition.interimResults = true;
        recognition.lang = options.language || "ko-KR";
        recognition.maxAlternatives = 1;

        const handleStart = () => {
          console.log("Web Speech: Recognition started");
          setIsListening(true);
          setError(null);
        };

        const handleEnd = () => {
          console.log("Web Speech: Recognition ended");
          setIsListening(false);

          if (options.continuous) {
            recognition.start();
          }
        };

        const handleError = (event: any) => {
          console.error("Web Speech: Recognition error", event.error);
          setError(`Speech recognition error: ${event.error}`);
          setIsListening(false);
        };

        const handleResult = (event: Event) => {
          const speechEvent = event as unknown as SpeechRecognitionEvent;
          for (
            let i = speechEvent.resultIndex;
            i < speechEvent.results.length;
            i++
          ) {
            const result = speechEvent.results[i];
            if (result.length > 0) {
              const transcript = result[0].transcript;
              const confidence = result[0].confidence;

              console.debug("Web Speech: Result:", transcript);

              // if (confidence >= (options.sensitivity || 0.8)) {
              checkForWakeWords(transcript);
              // }
            }
          }
        };

        recognition.addEventListener("start", handleStart);
        recognition.addEventListener("end", handleEnd);
        recognition.addEventListener("error", handleError);
        recognition.addEventListener("result", handleResult);

        return () => {
          recognition.removeEventListener("start", handleStart);
          recognition.removeEventListener("end", handleEnd);
          recognition.removeEventListener("error", handleError);
          recognition.removeEventListener("result", handleResult);
        };
      }
    }
  }, [checkForWakeWords]);

  const startListening = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      if (Platform.OS === "web") {
        if (recognitionRef.current) {
          recognitionRef.current.start();
        } else {
          console.warn("Speech recognition not supported. Maybe not yet?");
          setTimeout(() => startListening(), 500);
        }
      } else {
        // expo-speech-recognition for iOS/Android
        const result =
          await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
          throw new Error("Speech recognition permission not granted");
        }

        await ExpoSpeechRecognitionModule.start({
          lang: options.language || "ko-KR",
          interimResults: true,
          maxAlternatives: 1,
          continuous: options.continuous || false,
          requiresOnDeviceRecognition: false,
          addsPunctuation: false,
          contextualStrings: options.wakeWords,
        });
      }
    } catch (error: any) {
      console.error("Failed to start listening:", error);
      setError(error.message || "Failed to start voice recognition");
      setIsListening(false);
    }
  }, [options.language, options.continuous, options.wakeWords]);

  const stopListening = useCallback(async (): Promise<void> => {
    try {
      if (Platform.OS === "web") {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } else {
        await ExpoSpeechRecognitionModule.stop();
      }
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

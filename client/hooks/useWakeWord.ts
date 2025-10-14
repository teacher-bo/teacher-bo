import { useEffect, useState, useCallback, useRef } from "react";
import { Platform } from "react-native";

import V from "@react-native-voice/voice";

// React Native Voice는 네이티브 플랫폼에서만 사용
let Voice: typeof V | null = null;
if (Platform.OS !== "web") {
  try {
    Voice = require("@react-native-voice/voice").default;
  } catch (error) {
    console.warn("React Native Voice not available:", error);
  }
}

interface UseWakeWordOptions {
  wakeWords: string[];
  language?: string;
  sensitivity?: number; // 0-1, web에서만 사용
  continuous?: boolean; // web에서만 사용
}

interface UseWakeWordReturn {
  isListening: boolean;
  isSupported: boolean;
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
  const [isSupported, setIsSupported] = useState(false);

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

  // 플랫폼별 지원 여부 확인
  useEffect(() => {
    if (Platform.OS === "web") {
      // Web Speech Recognition API 지원 확인
      const isWebSupported =
        "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
      setIsSupported(isWebSupported);
    } else {
      // React Native Voice 지원 확인
      setIsSupported(Voice !== null);
    }
  }, []);

  // React Native Voice 설정 (iOS/Android)
  useEffect(() => {
    if (Platform.OS !== "web" && Voice) {
      Voice.onSpeechStart = () => {
        console.log("Voice: Speech started");
        setIsListening(true);
        setError(null);
      };

      Voice.onSpeechEnd = () => {
        console.log("Voice: Speech ended");
        setIsListening(false);
      };

      Voice.onSpeechError = (event: any) => {
        console.error("Voice: Speech error", event);
        setError(event.error?.message || "Speech recognition error");
        setIsListening(false);
      };

      Voice.onSpeechResults = (event: any) => {
        const results = event.value;
        console.log(results);
        if (results && results.length > 0) {
          const transcript = results[0];
          console.log("Voice: Speech result:", transcript);
          checkForWakeWords(transcript);
        }
      };

      Voice.onSpeechPartialResults = (event: any) => {
        const results = event.value;
        console.log(results);
        if (results && results.length > 0) {
          const transcript = results[0];
          checkForWakeWords(transcript);
        }
      };

      Voice.onSpeechVolumeChanged = (event: any) => {
        // 볼륨 변화 이벤트 (필요시 활용)
        // console.log("Voice: Volume changed", event.value);
      };

      return () => {
        Voice.destroy().then(Voice.removeAllListeners);
      };
    }
  }, []);

  // Web Speech Recognition 설정
  useEffect(() => {
    if (Platform.OS === "web" && isSupported) {
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

              console.log(
                "Web Speech: Result:",
                transcript,
                "Confidence:",
                confidence
              );

              if (confidence >= (options.sensitivity || 0.8)) {
                checkForWakeWords(transcript);
              }
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
  }, [isSupported, checkForWakeWords]);

  const startListening = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      if (Platform.OS === "web") {
        if (recognitionRef.current && isSupported) {
          recognitionRef.current.start();
        } else {
          throw new Error("Speech recognition not supported");
        }
      } else {
        if (Voice) {
          await Voice.start(options.language || "ko-KR");
        } else {
          throw new Error("Voice recognition not available");
        }
      }
    } catch (error: any) {
      console.error("Failed to start listening:", error);
      setError(error.message || "Failed to start voice recognition");
      setIsListening(false);
    }
  }, [isSupported, options.language]);

  const stopListening = useCallback(async (): Promise<void> => {
    try {
      if (Platform.OS === "web") {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } else {
        if (Voice) {
          await Voice.stop();
        }
      }
    } catch (error: any) {
      console.error("Failed to stop listening:", error);
      setError(error.message || "Failed to stop voice recognition");
    }
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    error,
  };
};

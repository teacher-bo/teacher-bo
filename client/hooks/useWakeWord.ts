import { useEffect, useState, useCallback, useRef } from "react";
import { Platform } from "react-native";

// React Native Voice는 네이티브 플랫폼에서만 사용
let Voice: any = null;
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
  const restartTimeoutRef = useRef<number | null>(null);

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
        if (results && results.length > 0) {
          const transcript = results[0];
          console.log("Voice: Speech result:", transcript);
          checkForWakeWords(transcript);
        }
      };

      Voice.onSpeechPartialResults = (event: any) => {
        const results = event.value;
        if (results && results.length > 0) {
          const transcript = results[0];
          checkForWakeWords(transcript);
        }
      };

      return () => {
        Voice.destroy().then(Voice.removeAllListeners);
      };
    }
  }, [checkForWakeWords]);

  // Web Speech Recognition 설정
  useEffect(() => {
    if (Platform.OS === "web" && isSupported) {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognitionRef.current = recognition;

        recognition.continuous = options.continuous || true;
        recognition.interimResults = true;
        recognition.lang = options.language || "ko-KR";
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          console.log("Web Speech: Recognition started");
          setIsListening(true);
          setError(null);
        };

        recognition.onend = () => {
          console.log("Web Speech: Recognition ended");
          setIsListening(false);

          // 자동 재시작 (continuous listening) - 단, 이미 재시작 중이 아닐 때만
          if (options.continuous && !restartTimeoutRef.current) {
            restartTimeoutRef.current = window.setTimeout(() => {
              if (recognitionRef.current && !isListening) {
                try {
                  recognitionRef.current.start();
                } catch (error) {
                  console.warn("Failed to restart recognition:", error);
                }
              }
              restartTimeoutRef.current = null;
            }, 1000);
          }
        };

        recognition.onerror = (event) => {
          console.error("Web Speech: Recognition error", event.error);
          setError(`Speech recognition error: ${event.error}`);
          setIsListening(false);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.length > 0) {
              const transcript = result[0].transcript;
              const confidence = result[0].confidence;

              console.log(
                "Web Speech: Result:",
                transcript,
                "Confidence:",
                confidence
              );

              // 신뢰도 체크 (옵션)
              if (confidence >= (options.sensitivity || 0.8)) {
                checkForWakeWords(transcript);
              }
            }
          }
        };
      }
    }

    return () => {
      if (restartTimeoutRef.current) {
        window.clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [isSupported, options, checkForWakeWords]);

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
      if (restartTimeoutRef.current) {
        window.clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }

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

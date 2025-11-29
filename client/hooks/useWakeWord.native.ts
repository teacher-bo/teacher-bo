import { useState, useCallback, useRef } from "react";
import { Platform } from "react-native";
import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
  ExpoSpeechRecognitionOptions,
} from "expo-speech-recognition";
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
  const shouldContinueRef = useRef(false);

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
    setIsListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent("end", () => {
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
  });

  useSpeechRecognitionEvent("error", (event) => {
    const errorType = event.error || "unknown";
    const silentErrors = ["no-speech", "aborted"];
    const criticalErrors = ["audio-capture", "not-allowed"];

    if (silentErrors.includes(errorType)) {
      console.debug(`Speech recognition: ${errorType} (will retry if active)`);
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
  });

  useSpeechRecognitionEvent("result", (event) => {
    const results = event.results;
    if (results && results.length > 0) {
      const transcript = results.map((result) => result.transcript).join(" ");
      checkForWakeWords(transcript);
    }
  });

  const startListening = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      shouldContinueRef.current = true;

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
      shouldContinueRef.current = false;

      await ExpoSpeechRecognitionModule.stop();
      console.log("✅ Speech recognition stopped");

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

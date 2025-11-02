import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { Audio, AVPlaybackStatus } from "expo-av";
import {
  SYNTHESIZE_SPEECH,
  GET_AVAILABLE_KOREAN_VOICES,
} from "../services/apolloClient";

export interface SynthesizeSpeechInput {
  text: string;
  voiceId?: string;
  engine?: string;
  outputFormat?: string;
  sampleRate?: string;
  languageCode?: string;
}

export interface SynthesizeSpeechResponse {
  audioBase64: string;
  contentType: string;
  audioSize: number;
}

export interface AvailableVoice {
  id: string;
  name: string;
  gender: string;
  engine: string[];
}

export const usePollyTTS = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);

  const [synthesizeSpeechMutation] = useMutation<
    { synthesizeSpeech: SynthesizeSpeechResponse },
    { input: SynthesizeSpeechInput }
  >(SYNTHESIZE_SPEECH, {
    errorPolicy: "all",
    onError: (err: any) => {
      console.error("Polly TTS Error:", err);
      setError(err.message);
      setIsLoading(false);
    },
  });

  const {
    data: voicesData,
    loading: voicesLoading,
    error: voicesError,
  } = useQuery<{ getAvailableKoreanVoices: AvailableVoice[] }>(
    GET_AVAILABLE_KOREAN_VOICES,
    {
      errorPolicy: "all",
    }
  );

  /**
   * 이전 사운드를 정리하는 헬퍼 함수
   */
  const cleanupCurrentSound = useCallback(async () => {
    if (currentSound) {
      try {
        await currentSound.unloadAsync();
      } catch (err) {
        console.warn("Error unloading sound:", err);
      }
      setCurrentSound(null);
      setIsPlaying(false);
    }
  }, [currentSound]);

  /**
   * TTS API를 호출하여 오디오 데이터를 가져오는 함수
   */
  const synthesizeAudio = useCallback(
    async (text: string, options?: Partial<SynthesizeSpeechInput>) => {
      console.log(
        "Synthesizing speech with Polly:",
        text.substring(0, 50) + "..."
      );

      const { data } = await synthesizeSpeechMutation({
        variables: {
          input: {
            text,
            voiceId: "Seoyeon",
            engine: "standard",
            outputFormat: "mp3",
            sampleRate: "22050",
            languageCode: "ko-KR",
            ...options,
          },
        },
      });

      if (!data?.synthesizeSpeech) {
        throw new Error("Failed to synthesize speech");
      }

      const { audioBase64, contentType, audioSize } = data.synthesizeSpeech;
      console.log("Created audio from Polly response, size:", audioSize);

      return `data:${contentType};base64,${audioBase64}`;
    },
    [synthesizeSpeechMutation]
  );

  /**
   * 오디오 재생이 완료될 때까지 대기하는 Promise
   */
  const waitForPlaybackComplete = useCallback(
    (sound: Audio.Sound): Promise<void> => {
      return new Promise((resolve) => {
        let isResolved = false;

        const resolveOnce = () => {
          if (!isResolved) {
            isResolved = true;
            setIsPlaying(false);
            sound.unloadAsync().catch(() => {});
            setCurrentSound(null);
            resolve();
          }
        };

        // 재생 완료 콜백 등록
        sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish) {
            resolveOnce();
          }
        });

        // 안전장치: 30초 후 강제 완료
        const timeoutId = setTimeout(() => {
          console.log("Audio playback timeout, forcing completion");
          resolveOnce();
        }, 30000);

        // Promise가 resolve되면 타임아웃 정리
        const originalResolve = resolve;
        resolve = () => {
          clearTimeout(timeoutId);
          originalResolve();
        };
      });
    },
    []
  );

  /**
   * 텍스트를 음성으로 변환하고 재생 완료까지 대기
   */
  const speakText = useCallback(
    async (
      text: string,
      options?: Partial<SynthesizeSpeechInput>
    ): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        // 1. 이전 사운드 정리
        await cleanupCurrentSound();

        // 2. TTS API 호출
        const audioUri = await synthesizeAudio(text, options);

        // 3. 오디오 객체 생성
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: false, volume: 1.0 }
        );

        // 4. 오디오 재생
        setCurrentSound(sound);
        await sound.playAsync();
        setIsPlaying(true);
        console.log("Successfully started playing Polly TTS audio");

        // 6. 재생 완료까지 대기
        await waitForPlaybackComplete(sound);
      } catch (err) {
        console.error("Error in speakText:", err);
        setError(err instanceof Error ? err.message : "Failed to speak text");
        await cleanupCurrentSound();
        throw err;
      } finally {
        setIsLoading(false);
      }
      console.log("speakText completed");
    },
    [synthesizeAudio, cleanupCurrentSound, waitForPlaybackComplete]
  );

  const stopSpeaking = useCallback(async (): Promise<void> => {
    try {
      if (currentSound) {
        await currentSound.stopAsync();
        await cleanupCurrentSound();
      }
    } catch (err) {
      console.error("Error stopping speech:", err);
    }
  }, [currentSound]);

  const pauseSpeaking = useCallback(async (): Promise<void> => {
    try {
      if (currentSound && isPlaying) {
        await currentSound.pauseAsync();
        setIsPlaying(false);
      }
    } catch (err) {
      console.error("Error pausing speech:", err);
    }
  }, [currentSound, isPlaying]);

  const resumeSpeaking = useCallback(async (): Promise<void> => {
    try {
      if (currentSound && !isPlaying) {
        await currentSound.playAsync();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Error resuming speech:", err);
    }
  }, [currentSound, isPlaying]);

  return {
    speakText,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    isLoading,
    isPlaying,
    error,
    availableVoices: voicesData?.getAvailableKoreanVoices || [],
    voicesLoading,
    voicesError: voicesError?.message || null,
  };
};

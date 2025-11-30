import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  useAudioPlayer,
  AudioSource,
  setAudioModeAsync,
  AudioModule,
} from "expo-audio";
import {
  SYNTHESIZE_SPEECH,
  GET_AVAILABLE_KOREAN_VOICES,
} from "../services/apolloClient";
import { Alert } from "react-native";

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
  const [error, setError] = useState<string | null>(null);
  const player = useAudioPlayer();

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
   * 오디오 플레이어 정리 함수
   */
  const cleanupPlayer = useCallback(() => {
    try {
      player.pause();
      player.remove();
    } catch (err) {
      console.warn("Error cleaning up player:", err);
    }
    setIsLoading(false);
    setError(null);
  }, [player]);

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
  const waitForPlaybackComplete = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      let hasStarted = false;

      const checkInterval = setInterval(() => {
        if (player.playing && !hasStarted) {
          hasStarted = true;
        }

        if (hasStarted && !player.playing) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 30000);
    });
  }, [player]);
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

        // 1. 이전 재생 정리
        cleanupPlayer();

        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          shouldRouteThroughEarpiece: false,
        });

        // 2. iOS 자동재생 정책 우회: 사용자 제스처 컨텍스트 내에서 빈 오디오 로드
        // 매우 짧은 무음 MP3 (44 bytes, 약 0.026초)
        const silentAudio =
          "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4T/gNH0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

        try {
          // 사용자 제스처 컨텍스트에서 즉시 오디오 플레이어 초기화
          player.replace({ uri: silentAudio } as AudioSource);
          await player.play();
          console.log("Silent audio loaded to preserve user gesture context");
        } catch (initError) {
          console.warn("Failed to initialize silent audio:", initError);
          // 계속 진행 - 일부 환경에서는 여전히 작동할 수 있음
        }

        // 3. TTS API 호출 (비동기)
        const audioUri = await synthesizeAudio(text, options);

        // 4. 실제 TTS 오디오로 교체 및 재생
        player.replace({ uri: audioUri } as AudioSource);
        await player.play();
        console.log("Successfully started playing Polly TTS audio");

        // 5. 재생 완료까지 대기
        await waitForPlaybackComplete();
      } catch (err) {
        console.error("Error in speakText:", err);
        setError(err instanceof Error ? err.message : "Failed to speak text");
        cleanupPlayer();
        throw err;
      } finally {
        setIsLoading(false);
      }
      console.log("speakText completed");
    },
    [synthesizeAudio, cleanupPlayer, waitForPlaybackComplete, player]
  );

  const stopSpeaking = useCallback((): void => {
    try {
      cleanupPlayer();
    } catch (err) {
      console.error("Error stopping speech:", err);
    }
  }, [cleanupPlayer]);

  const pauseSpeaking = useCallback((): void => {
    try {
      player.pause();
    } catch (err) {
      console.error("Error pausing speech:", err);
    }
  }, [player]);

  const resumeSpeaking = useCallback((): void => {
    try {
      player.play();
    } catch (err) {
      console.error("Error resuming speech:", err);
    }
  }, [player]);

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert("Permission to access microphone was denied");
      }

      setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        shouldRouteThroughEarpiece: false, // 안드로이드 웹에서 수화기 대신 스피커로 출력하도록 강제
      });
    })();
  }, []);

  return {
    speakText,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    isLoading,
    isPlaying: player.playing,
    error,
    availableVoices: voicesData?.getAvailableKoreanVoices || [],
    voicesLoading,
    voicesError: voicesError?.message || null,
  };
};

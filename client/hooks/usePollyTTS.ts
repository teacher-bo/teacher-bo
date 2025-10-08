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

  const speakText = useCallback(
    async (
      text: string,
      options?: Partial<SynthesizeSpeechInput>
    ): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        // 이전 재생 중인 사운드가 있다면 정지
        if (currentSound) {
          await currentSound.unloadAsync();
          setCurrentSound(null);
          setIsPlaying(false);
        }

        console.log(
          "Synthesizing speech with Polly:",
          text.substring(0, 50) + "..."
        );

        const { data } = await synthesizeSpeechMutation({
          variables: {
            input: {
              text,
              voiceId: "Seoyeon", // 기본값
              engine: "neural",
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

        const { audioBase64, contentType } = data.synthesizeSpeech;

        // Base64를 URI로 변환
        const audioUri = `data:${contentType};base64,${audioBase64}`;

        console.log(
          "Creating audio sound from Polly response, size:",
          data.synthesizeSpeech.audioSize
        );

        // Audio 객체 생성 및 재생
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true, volume: 1.0 },
          (status: AVPlaybackStatus) => {
            if (status.isLoaded) {
              if (status.didJustFinish) {
                setIsPlaying(false);
                sound.unloadAsync();
                setCurrentSound(null);
              }
            }
          }
        );

        setCurrentSound(sound);
        setIsPlaying(true);

        console.log("Successfully started playing Polly TTS audio");
      } catch (err) {
        console.error("Error in speakText:", err);
        setError(err instanceof Error ? err.message : "Failed to speak text");
      } finally {
        setIsLoading(false);
      }
    },
    [synthesizeSpeechMutation, currentSound]
  );

  const stopSpeaking = useCallback(async (): Promise<void> => {
    try {
      if (currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
        setIsPlaying(false);
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

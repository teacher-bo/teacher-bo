import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExpoAudioStreamModule,
  useAudioRecorder,
  AudioDataEvent,
} from "@siteed/expo-audio-studio";
import { useSocket } from "./useSocket";

interface UseAudioServiceReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  audioLevel: number;
  sampleRate: number;
  bufferSize: number;
  sttDatas: STTData[];
}

interface STTData {
  clientId: string;
  isFinal: boolean;
  resultId: string;
  text: string;
  timestamp: string;
}

export const useStreamingAudioService = (): UseAudioServiceReturn => {
  const [isRecordingState, setIsRecordingState] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [sampleRate, setSampleRate] = useState(0);
  const [bufferSize, setBufferSize] = useState(0);

  const [sttDatas, setSttDatas] = useState<STTData[]>([]);

  const onAudioDataRef = useRef<(event: AudioDataEvent) => Promise<void>>(
    async () => {}
  );
  const audioChunksRef = useRef<string[]>([]);
  const webAudioChunksRef = useRef<Float32Array>(new Float32Array(0));
  const currentSizeRef = useRef(0);
  const [socketId, setSocketId] = useState<string | null>(null);

  const {
    startRecording: startRecordingNative,
    stopRecording: stopRecordingNative,
  } = useAudioRecorder();

  const {
    sendAudioChunk: sendAudioChunkViaSocket,
    connect: connectSocket,
    disconnect: disconnectSocket,
  } = useSocket({
    socketUrl: process.env.EXPO_PUBLIC_API_URL!,
    onTranscriptionResult: (data) => {
      console.log(data);
      setSttDatas((prev) => {
        const exists = prev.find((d) => d.resultId === data.resultId);
        if (exists) {
          return prev.map((d) => (d.resultId === data.resultId ? data : d));
        } else {
          return [...prev, data];
        }
      });
    },
    onTranscriptionError: (error) => {
      console.error("Transcription error handled:", error);
    },
    onConnect: (s) => setSocketId(s.id!),
  });

  // 오디오 청크 전송 wrapper
  const sendAudioChunk = useCallback(
    (audioData: string, soundLevel: number) => {
      sendAudioChunkViaSocket(audioData, soundLevel);
    },
    [sendAudioChunkViaSocket]
  );

  // 오디오 데이터 처리 핸들러
  const setupAudioDataHandler = useCallback(() => {
    onAudioDataRef.current = async (event: AudioDataEvent): Promise<void> => {
      try {
        const { data, eventDataSize } = event;
        console.debug(
          `🎤 Processing audio data: type=${typeof data}, size=${eventDataSize}`
        );

        if (!eventDataSize || eventDataSize === 0) return;

        if (typeof data === "string") {
          console.debug("📱 Processing string data (Native platform)");
          if (audioChunksRef.current) {
            audioChunksRef.current.push(data);
          }
          sendAudioChunk(data, 0);
        } else if (data instanceof Float32Array) {
          console.debug("🌐 Processing Float32Array data (Web platform)");

          // Float32Array를 PCM 16-bit로 변환 후 Base64 인코딩
          const pcmData = new Int16Array(data.length);
          for (let i = 0; i < data.length; i++) {
            const sample = Math.max(-1, Math.min(1, data[i]));
            pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          }

          const uint8Array = new Uint8Array(pcmData.buffer);
          const base64String = btoa(String.fromCharCode(...uint8Array));
          sendAudioChunk(base64String, 0);
        } else if (
          ArrayBuffer.isView(data) &&
          (data as any).BYTES_PER_ELEMENT === 2
        ) {
          // Int16Array 처리 - 이미 PCM 16-bit 포맷이므로 직접 Base64로 변환
          console.debug("Processing Int16Array data");

          const int16Data = data as Int16Array;
          const uint8Array = new Uint8Array(int16Data.buffer);
          const base64String = btoa(String.fromCharCode(...uint8Array));
          sendAudioChunk(base64String, 0);
        }
      } catch (error) {
        console.error("Error processing audio data:", error);
      }
      return Promise.resolve();
    };
  }, [sendAudioChunk]);

  // 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      const { granted } = await ExpoAudioStreamModule.requestPermissionsAsync();
      if (!granted) {
        console.log("Microphone permissions denied");
        return;
      }

      setupAudioDataHandler();

      webAudioChunksRef.current = new Float32Array(0);
      audioChunksRef.current = [];
      currentSizeRef.current = 0;

      await startRecordingNative({
        sampleRate: 16000,
        onAudioStream: (event: AudioDataEvent): Promise<void> =>
          onAudioDataRef.current(event),
      });

      setSampleRate(16000);
      setBufferSize(1024);
      setIsRecordingState(true);

      console.log("Recording started with Socket.IO streaming", {
        socketId: socketId,
        sampleRate: 16000,
      });
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw error;
    }
  }, [setupAudioDataHandler, connectSocket]);

  // 녹음 중지
  const stopRecording = useCallback(async () => {
    try {
      await stopRecordingNative();
      setIsRecordingState(false);

      audioChunksRef.current = [];
      webAudioChunksRef.current = new Float32Array(0);
      setAudioLevel(0);

      console.log("Recording stopped and Socket.IO disconnected");
    } catch (error) {
      console.error("Failed to stop recording:", error);
      throw error;
    }
  }, [disconnectSocket]);

  useEffect(() => {
    connectSocket();
    return () => {
      stopRecordingNative();
      disconnectSocket();
      audioChunksRef.current = [];
      webAudioChunksRef.current = new Float32Array(0);
    };
  }, []);

  return {
    isRecording: isRecordingState,
    startRecording,
    stopRecording,
    audioLevel,
    sampleRate,
    bufferSize,
    sttDatas,
  };
};

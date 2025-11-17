import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExpoAudioStreamModule,
  useAudioRecorder,
  AudioDataEvent,
} from "@siteed/expo-audio-studio";
import { useSocket } from "./useSocket";
import { ENV } from "../utils/env";

interface UseAudioServiceReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: (sendToServer?: boolean) => Promise<void>;
  audioLevel: number;
  sampleRate: number;
  bufferSize: number;
  sttDatas: STTData[];
  resetSttDatas: () => void;
  reconnectSocket: () => void;
  onVadEnded?: (callback: (data: any) => void) => void;
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
  const vadEndedCallbackRef = useRef<((data: any) => void) | null>(null);

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
    stopTranscriptionStream,
    connect: connectSocket,
    disconnect: disconnectSocket,
    reconnect: reconnectSocket,
  } = useSocket({
    socketUrl: ENV.API_BASE_URL,
    onTranscriptionResult: (data) => {
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
    onVadEnded: (data) => {
      console.log("🎙️ VAD ended in useStreamingAudioService:", data);
      vadEndedCallbackRef.current?.(data);
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
    console.log("🎬 Starting recording...");
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

      // 첫 오디오 청크 전송 시 서버에서 자동으로 transcription stream 시작됨
      console.log("Recording started with Socket.IO streaming", {
        socketId,
        sampleRate: 16000,
      });
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw error;
    }
  }, [setupAudioDataHandler, socketId]);

  // 녹음 중지
  const stopRecording = useCallback(
    async (sendToServer = true) => {
      try {
        if (sendToServer) {
          // transcription stream 먼저 중지
          stopTranscriptionStream();
        }

        await stopRecordingNative();
        setIsRecordingState(false);

        audioChunksRef.current = [];
        webAudioChunksRef.current = new Float32Array(0);
        setAudioLevel(0);

        console.log("Recording stopped");
      } catch (error) {
        console.error("Failed to stop recording:", error);
        throw error;
      }
    },
    [stopTranscriptionStream]
  );

  useEffect(() => {
    connectSocket();
    return () => {
      stopRecordingNative().catch(console.error);
      disconnectSocket();
      audioChunksRef.current = [];
      webAudioChunksRef.current = new Float32Array(0);
    };
  }, []);

  // VAD ended 콜백 등록 함수
  const onVadEnded = useCallback((callback: (data: any) => void) => {
    vadEndedCallbackRef.current = callback;
  }, []);

  return {
    isRecording: isRecordingState,
    startRecording,
    stopRecording,
    audioLevel,
    sampleRate,
    bufferSize,
    sttDatas,
    resetSttDatas: () => setSttDatas([]),
    reconnectSocket,
    onVadEnded,
  };
};

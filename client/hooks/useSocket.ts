import { useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

export interface TranscriptionResultData {
  clientId: string;
  isFinal: boolean;
  resultId: string;
  text: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface TranscriptionErrorData {
  error?: string;
  message?: string;
  timestamp?: number | string;
  [key: string]: unknown;
}

export interface VadEndedData {
  timestamp: number | string;
  confidence?: number;
  message?: string;
  [key: string]: unknown;
}

interface AudioChunkMessage {
  audioData: string;
  timestamp: number;
  soundLevel: number;
}

interface StopTranscriptionPayload {
  sessionId?: string;
}

interface ServerToClientEvents {
  vadEnded: (data: VadEndedData) => void;
  transcriptionResult: (data: TranscriptionResultData) => void;
  transcriptionError: (error: TranscriptionErrorData) => void;
}

interface ClientToServerEvents {
  audioChunk: (message: AudioChunkMessage) => void;
  stopTranscriptionStream: (payload: StopTranscriptionPayload) => void;
}

export type AudioSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseSocketOptions {
  vad: boolean;
  socketUrl: string;
  onTranscriptionResult?: (data: TranscriptionResultData) => void;
  onTranscriptionError?: (error: TranscriptionErrorData) => void;
  onVadEnded?: (data: VadEndedData) => void;
  onConnect?: (socket: AudioSocket) => void;
  onDisconnect?: (socket: AudioSocket) => void;
  onConnectError?: (error: Error) => void;
}

interface UseSocketReturn {
  socket: AudioSocket | null;
  isConnected: boolean;
  sendAudioChunk: (audioData: string, soundLevel: number) => void;
  stopTranscriptionStream: (sessionId?: string) => void;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export const useSocket = ({
  vad,
  socketUrl,
  onTranscriptionResult,
  onTranscriptionError,
  onVadEnded,
  onConnect,
  onDisconnect,
  onConnectError,
}: UseSocketOptions): UseSocketReturn => {
  const socketRef = useRef<AudioSocket | null>(null);
  const isConnectedRef = useRef(false);

  // Socket.IO 연결 설정
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log("⚠️ Socket already connected");
      return;
    }

    // 기존 연결이 있다면 먼저 정리
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    console.log(`🔌 Connecting to Socket.IO: ${socketUrl}`);

    socketRef.current = io(socketUrl, {
      transports: ["websocket", "polling"],
      forceNew: true,
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      upgrade: true,
      rememberUpgrade: false,
      autoConnect: true,
      query: {
        vad: vad.toString(),
      },
    }) as AudioSocket;

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("🟢 Socket.IO connected:", socket.id);
      isConnectedRef.current = true;

      onConnect?.(socket);
    });

    socket.on("vadEnded", (data) => {
      console.log("🎙️ VAD ended event received:", data);
      onVadEnded?.(data);
    });

    socket.on("transcriptionResult", (data) => {
      onTranscriptionResult?.(data);
    });

    socket.on("transcriptionError", (error) => {
      console.error("❌ Transcription error:", error);
      onTranscriptionError?.(error);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket.IO disconnected");
      isConnectedRef.current = false;
      onDisconnect?.(socket);
    });

    socket.on("connect_error", (error) => {
      console.error("🔴 Socket.IO connection error:", error);
      isConnectedRef.current = false;
      onConnectError?.(error);
    });
  }, [
    vad,
    socketUrl,
    onConnect,
    onTranscriptionResult,
    onTranscriptionError,
    onVadEnded,
    onDisconnect,
    onConnectError,
  ]);

  // Socket.IO 연결 해제
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      isConnectedRef.current = false;
      console.log("🔌 Socket.IO connection closed");
    }
  }, []);

  // Socket.IO 재연결 (socketId 재발급)
  const reconnect = useCallback(() => {
    console.log("🔄 Reconnecting to Socket.IO...");
    disconnect();
    // Disconnect 후 약간의 딜레이를 두고 재연결
    setTimeout(() => {
      connect();
    }, 100);
  }, [disconnect, connect]);

  // Transcription stream 중지
  const stopTranscriptionStream = useCallback((sessionId?: string) => {
    if (!socketRef.current) {
      console.error("Socket not available");
      return;
    }

    console.log(
      "🛑 Stopping transcription stream",
      sessionId ? `for session: ${sessionId}` : "(no session)"
    );

    // Safe payload construction
    const payload: { sessionId?: string } = {};
    if (sessionId) {
      payload.sessionId = sessionId;
    }

    socketRef.current.emit("stopTranscriptionStream", payload);
  }, []);

  // 오디오 청크 전송
  const sendAudioChunk = useCallback(
    (audioData: string, soundLevel: number) => {
      if (socketRef.current && socketRef.current.connected) {
        const audioMessage = {
          audioData,
          timestamp: Date.now(),
          soundLevel,
        };

        console.debug(
          `🎵 Streaming audio chunk for client: ${socketRef.current.id}, size: ${audioData.length}`
        );

        try {
          socketRef.current.emit("audioChunk", audioMessage);
          console.debug(`✅ Audio chunk streamed successfully via Socket.IO`);
        } catch (error) {
          console.error(`❌ Socket.IO streaming error:`, error);
        }
      } else {
        console.warn("Socket.IO not connected, skipping audio chunk");
      }
    },
    []
  );

  return {
    socket: socketRef.current,
    isConnected: isConnectedRef.current,
    sendAudioChunk,
    stopTranscriptionStream,
    connect,
    disconnect,
    reconnect,
  };
};

import { useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface UseSocketOptions {
  socketUrl: string;
  onTranscriptionResult?: (data: any) => void;
  onTranscriptionError?: (error: any) => void;
  onConnect?: (socket: Socket) => void;
  onDisconnect?: (socket: Socket) => void;
  onConnectError?: (error: any) => void;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  sendAudioChunk: (audioData: string, soundLevel: number) => void;
  connect: () => void;
  disconnect: () => void;
}

export const useSocket = ({
  socketUrl,
  onTranscriptionResult,
  onTranscriptionError,
  onConnect,
  onDisconnect,
  onConnectError,
}: UseSocketOptions): UseSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
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
      transports: ["websocket", "polling"], // Add polling fallback for web
      forceNew: true,
      timeout: 20000, // Increase timeout
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      // Web-specific optimizations
      upgrade: true,
      rememberUpgrade: false,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("🟢 Socket.IO connected:", socket.id);
      isConnectedRef.current = true;

      // 세션 시작 이벤트 전송
      socket.emit("startTranscriptionStream");

      onConnect?.(socket);
    });

    socket.on("transcriptionResult", (data: any) => {
      onTranscriptionResult?.(data);
    });

    socket.on("transcriptionError", (error: any) => {
      console.error("❌ Transcription error:", error);
      onTranscriptionError?.(error);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket.IO disconnected");
      isConnectedRef.current = false;
      onDisconnect?.(socket);
    });

    socket.on("connect_error", (error: any) => {
      console.error("🔴 Socket.IO connection error:", error);
      isConnectedRef.current = false;
      onConnectError?.(error);
    });
  }, [
    socketUrl,
    onConnect,
    onTranscriptionResult,
    onTranscriptionError,
    onDisconnect,
    onConnectError,
  ]);

  // Socket.IO 연결 해제
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("stopTranscriptionStream");
      socketRef.current.disconnect();
      socketRef.current = null;
      isConnectedRef.current = false;
      console.log("🔌 Socket.IO connection closed");
    }
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
    connect,
    disconnect,
  };
};

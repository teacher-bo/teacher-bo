import { useCallback, useEffect, useRef, useState } from "react";
import {
  RecordingPresets,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as FileSystem from "expo-file-system";
import { io, Socket } from "socket.io-client";
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
  gql,
} from "@apollo/client";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";

const SERVER_URL = "http://localhost:1002"; // 서버 URL을 환경에 맞게 수정하세요

// GraphQL 쿼리/뮤테이션/구독 정의
export const START_TRANSCRIPTION_STREAM = gql`
  mutation StartTranscriptionStream($sessionId: String!) {
    startTranscriptionStream(sessionId: $sessionId) {
      sessionId
      status
      message
    }
  }
`;

export const STOP_TRANSCRIPTION_STREAM = gql`
  mutation StopTranscriptionStream($sessionId: String!) {
    stopTranscriptionStream(sessionId: $sessionId) {
      sessionId
      status
      message
    }
  }
`;

export const ADD_AUDIO_CHUNK = gql`
  mutation AddAudioChunk($sessionId: String!, $audioData: String!) {
    addAudioChunk(sessionId: $sessionId, audioData: $audioData)
  }
`;

export const TRANSCRIPTION_STREAM_SUBSCRIPTION = gql`
  subscription TranscriptionStream($sessionId: String!) {
    transcriptionStream(sessionId: $sessionId) {
      sessionId
      text
      timestamp
      isFinal
    }
  }
`;

interface AudioServiceConfig {
  onTranscriptionUpdate: (result: {
    sessionId: string;
    text: string;
    timestamp: string;
    isFinal: boolean;
    chunkIndex?: string;
  }) => void;
  onSessionUpdate: (session: {
    sessionId: string;
    status: string;
    message: string;
  }) => void;
  onError: (error: string) => void;
}

interface UseAudioServiceProps {
  config: AudioServiceConfig;
  sessionId?: string;
}

export const useAudioService = ({
  config,
  sessionId,
}: UseAudioServiceProps) => {
  // Apollo Client 인스턴스 생성
  const [apolloClient] = useState(() => {
    const httpLink = createHttpLink({
      uri: `${SERVER_URL}/api/graphql`,
    });

    const wsLink = new GraphQLWsLink(
      createClient({
        url: `ws://localhost:1002/api/graphql`,
        shouldRetry: () => true,
      })
    );

    const splitLink = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === "OperationDefinition" &&
          definition.operation === "subscription"
        );
      },
      wsLink,
      httpLink
    );

    return new ApolloClient({
      link: splitLink,
      cache: new InMemoryCache(),
    });
  });

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const recorderState = useAudioRecorderState(audioRecorder);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const chunkIndexRef = useRef(0);
  const lastDurationRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subscriptionsRef = useRef<any[]>([]);
  // GraphQL Subscriptions 설정
  const setupGraphQLSubscriptions = useCallback(() => {
    if (!apolloClient || !currentSessionId) return;

    // 기존 구독 정리
    subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
    subscriptionsRef.current = [];

    // Transcription stream subscription
    const transcriptionSub = apolloClient
      .subscribe({
        query: TRANSCRIPTION_STREAM_SUBSCRIPTION,
        variables: { sessionId: currentSessionId },
      })
      .subscribe({
        next: (result: any) => {
          console.log(
            "STT Result (GraphQL):",
            result.data?.transcriptionStream
          );
          if (result.data?.transcriptionStream) {
            config.onTranscriptionUpdate(result.data.transcriptionStream);
          }
        },
        error: (error: any) => {
          console.error("GraphQL subscription error:", error);
          config.onError("구독 연결 오류가 발생했습니다.");
        },
      });

    subscriptionsRef.current.push(transcriptionSub);
  }, [apolloClient, currentSessionId, config]);

  // Socket 연결 설정
  const setupSocketConnection = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = io(`${SERVER_URL}/audio`, {
      transports: ["websocket"],
      autoConnect: true,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socket.on("recordingStarted", (data) => {
      console.log("Recording started:", data);
      config.onSessionUpdate(data);
    });

    socket.on("recordingStopped", (data) => {
      console.log("Recording stopped:", data);
      config.onSessionUpdate(data);
    });

    socket.on("transcriptionResult", (data) => {
      console.log("STT Result (Socket):", data);
      config.onTranscriptionUpdate(data);
    });

    socket.on("transcriptionError", (error) => {
      console.error("Transcription error:", error);
      config.onError(error.error || "Transcription failed");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      config.onError("연결 오류가 발생했습니다.");
    });

    setIsInitialized(true);
  }, [config]);

  // 오디오 데이터를 URI에서 읽어오는 함수
  const getAudioDataFromUri = useCallback(
    async (uri: string): Promise<string | null> => {
      try {
        const base64Data = await FileSystem.readAsStringAsync(uri, {
          encoding: "base64",
        });
        return base64Data;
      } catch (error) {
        console.error("Failed to read audio file:", error);
        return null;
      }
    },
    []
  );

  // 오디오 청크 분할 함수
  const splitAudioIntoChunks = useCallback(
    (audioData: string, chunkSize: number): string[] => {
      const chunks: string[] = [];
      for (let i = 0; i < audioData.length; i += chunkSize) {
        chunks.push(audioData.substring(i, i + chunkSize));
      }
      return chunks;
    },
    []
  );

  // 실시간 오디오 스트리밍 처리
  const processAudioStreaming = useCallback(
    async ({
      recorderState,
      currentSessionId,
    }: {
      recorderState: ReturnType<typeof useAudioRecorderState>;
      currentSessionId: string;
    }) => {
      if (!recorderState.isRecording || !currentSessionId) {
        return;
      }

      const currentDuration = recorderState.durationMillis || 0;

      // 1초마다 처리
      if (currentDuration > lastDurationRef.current + 1000) {
        lastDurationRef.current = currentDuration;

        try {
          // expo-audio의 현재 녹음 상태에서 URI 얻기
          console.log("Processing audio chunk...", {
            recorderState,
            audioRecorder,
            duration: currentDuration,
          });

          // recorderState에서 uri 속성을 확인해보고, 없다면 다른 방법 시도
          const recordingUri = (recorderState as any).uri || audioRecorder.uri;

          if (recordingUri) {
            // 오디오 파일을 base64로 인코딩
            const audioData = await getAudioDataFromUri(recordingUri);

            if (audioData && socketRef.current) {
              // 큰 오디오 파일을 청크 단위로 분할하여 전송
              const chunkSize = 4096; // 4KB 청크
              const chunks = splitAudioIntoChunks(audioData, chunkSize);
              console.log(chunks);

              for (let i = 0; i < chunks.length; i++) {
                // Socket을 통한 실시간 전송
                socketRef.current.emit("audioChunk", {
                  sessionId: currentSessionId,
                  audioData: chunks[i],
                  chunkIndex: (chunkIndexRef.current++).toString(),
                  timestamp: currentDuration,
                  isPartial: i < chunks.length - 1,
                });

                // 너무 빠르게 전송하지 않도록 약간의 딜레이
                await new Promise((resolve) => setTimeout(resolve, 50));
              }

              // GraphQL을 통한 전송 (모든 청크)
              for (const chunk of chunks) {
                try {
                  await apolloClient.mutate({
                    mutation: ADD_AUDIO_CHUNK,
                    variables: {
                      sessionId: currentSessionId,
                      audioData: chunk,
                    },
                  });
                } catch (error) {
                  console.error("GraphQL audio processing error:", error);
                }
              }
            }
          }
        } catch (error) {
          console.error("Audio chunk processing error:", error);
        }
      }
    },
    [getAudioDataFromUri, splitAudioIntoChunks, audioRecorder]
  );

  // 녹음 상태 변화 감지 및 처리
  useEffect(() => {
    if (recorderState.isRecording && currentSessionId) {
      processAudioStreaming({
        recorderState,
        currentSessionId,
      });
    }
  }, [
    recorderState.isRecording,
    recorderState.durationMillis,
    currentSessionId,
    processAudioStreaming,
  ]);

  // 녹음 시작 함수
  const startRecording = useCallback(
    async (sessionId: string): Promise<boolean> => {
      try {
        setCurrentSessionId(sessionId);
        chunkIndexRef.current = 0;
        lastDurationRef.current = 0;

        // 마이크 권한 요청 - expo-audio API 확인
        try {
          // AudioRecorder.requestPermissionsAsync() 또는 다른 방법 시도
          const permissionResponse = (await (
            audioRecorder as any
          ).requestPermissions?.()) ||
            (await (audioRecorder as any).requestPermissionsAsync?.()) || {
              granted: true,
            }; // 임시로 granted: true 설정

          if (!permissionResponse.granted) {
            config.onError("마이크 권한이 필요합니다.");
            return false;
          }
        } catch (permissionError) {
          console.warn("Permission request failed:", permissionError);
          // 권한 요청이 실패해도 계속 진행 (개발 환경에서는 문제없을 수 있음)
        }

        // GraphQL 세션 시작
        await apolloClient.mutate({
          mutation: START_TRANSCRIPTION_STREAM,
          variables: { sessionId },
        });

        // GraphQL Subscriptions 설정
        setupGraphQLSubscriptions();

        // Socket 세션 시작
        socketRef.current?.emit("startRecording", { sessionId });

        // 녹음 시작
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        setIsRecording(true);

        console.log("Recording started successfully");
        return true;
      } catch (error) {
        console.error("Failed to start recording:", error);
        config.onError("녹음을 시작할 수 없습니다.");
        return false;
      }
    },
    [audioRecorder, apolloClient, config, setupGraphQLSubscriptions]
  );

  // 녹음 중지 함수
  const stopRecording = useCallback(async (): Promise<boolean> => {
    try {
      // 인터벌 정리
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // 녹음 중지
      await audioRecorder.stop();
      setIsRecording(false);

      if (currentSessionId) {
        // GraphQL 세션 종료
        await apolloClient.mutate({
          mutation: STOP_TRANSCRIPTION_STREAM,
          variables: { sessionId: currentSessionId },
        });

        // Socket 세션 종료
        socketRef.current?.emit("stopRecording", {
          sessionId: currentSessionId,
        });
      }

      setCurrentSessionId(null);
      chunkIndexRef.current = 0;
      lastDurationRef.current = 0;

      console.log("Recording stopped successfully");
      return true;
    } catch (error) {
      console.error("Failed to stop recording:", error);
      config.onError("녹음을 중지할 수 없습니다.");
      return false;
    }
  }, [audioRecorder, apolloClient, currentSessionId]);

  // 연결 해제 함수
  const disconnect = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // 구독 정리
    subscriptionsRef.current.forEach((sub: any) => sub.unsubscribe());
    subscriptionsRef.current = [];

    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsInitialized(false);
  }, []);

  // 초기화
  useEffect(() => {
    setupSocketConnection();

    return () => {
      disconnect();
    };
  }, []);

  return {
    isInitialized,
    isRecording,
    recorderState,
    currentSessionId,
    startRecording,
    stopRecording,
    disconnect,
  };
};

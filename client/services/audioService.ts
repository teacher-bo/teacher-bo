import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { io, Socket } from "socket.io-client";
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
  from,
  type DefaultOptions,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { gql } from "@apollo/client";
import { Buffer } from "buffer";

const SERVER_URL = "http://localhost:1002"; // 서버 URL을 환경에 맞게 수정하세요

// GraphQL 쿼리/뮤테이션/구독 정의
export const START_RECORDING_SESSION = gql`
  mutation StartRecordingSession($sessionId: String!) {
    startRecordingSession(sessionId: $sessionId) {
      sessionId
      status
      message
    }
  }
`;

export const STOP_RECORDING_SESSION = gql`
  mutation StopRecordingSession($sessionId: String!) {
    stopRecordingSession(sessionId: $sessionId) {
      sessionId
      status
      message
    }
  }
`;

export const PROCESS_AUDIO_DATA = gql`
  mutation ProcessAudioData(
    $sessionId: String!
    $audioData: String!
    $chunkIndex: Int!
  ) {
    processAudioData(
      sessionId: $sessionId
      audioData: $audioData
      chunkIndex: $chunkIndex
    ) {
      sessionId
      text
      timestamp
      isFinal
      chunkIndex
    }
  }
`;

export const TRANSCRIPTION_UPDATED_SUBSCRIPTION = gql`
  subscription TranscriptionUpdated($sessionId: String!) {
    transcriptionUpdated(sessionId: $sessionId) {
      sessionId
      text
      timestamp
      isFinal
      chunkIndex
    }
  }
`;

export const RECORDING_SESSION_UPDATED_SUBSCRIPTION = gql`
  subscription RecordingSessionUpdated($sessionId: String!) {
    recordingSessionUpdated(sessionId: $sessionId) {
      sessionId
      status
      message
    }
  }
`;

interface AudioServiceConfig {
  onTranscriptionUpdate: (result: {
    sessionId: string;
    text: string;
    timestamp: string;
    isFinal: boolean;
    chunkIndex?: number;
  }) => void;
  onSessionUpdate: (session: {
    sessionId: string;
    status: string;
    message: string;
  }) => void;
  onError: (error: string) => void;
}

class AudioService {
  private socket: Socket | null = null;
  private apolloClient: any = null;
  private recording: Audio.Recording | null = null;
  private sessionId: string | null = null;
  private chunkIndex = 0;
  private config: AudioServiceConfig | null = null;
  private subscriptions: any[] = [];

  constructor() {
    this.setupApolloClient();
  }

  private setupApolloClient() {
    // HTTP Link
    const httpLink = createHttpLink({
      uri: `${SERVER_URL}/api/graphql`,
    });

    // WebSocket Link for subscriptions
    const wsLink = new GraphQLWsLink(
      createClient({
        url: `ws://localhost:1002/api/graphql`,
        shouldRetry: (errOrCloseEvent: any) => {
          console.log("GraphQL WS retry attempt:", errOrCloseEvent);
          return true;
        },
      })
    );

    // Split link based on operation type
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

    this.apolloClient = new ApolloClient({
      link: splitLink,
      cache: new InMemoryCache(),
      defaultOptions: {
        watchQuery: {
          errorPolicy: "all",
        },
        query: {
          errorPolicy: "all",
        },
      },
    });
  }

  private setupSocketConnection() {
    this.socket = io(`${SERVER_URL}/audio`, {
      transports: ["websocket"],
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
    });

    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    this.socket.on("recordingStarted", (data) => {
      console.log("Recording started:", data);
      this.config?.onSessionUpdate(data);
    });

    this.socket.on("recordingStopped", (data) => {
      console.log("Recording stopped:", data);
      this.config?.onSessionUpdate(data);
    });

    this.socket.on("transcriptionResult", (data) => {
      console.log("STT Result (Socket):", data);
      this.config?.onTranscriptionUpdate(data);
    });

    this.socket.on("transcriptionError", (error) => {
      console.error("Transcription error:", error);
      this.config?.onError(error.error || "Transcription failed");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.config?.onError("연결 오류가 발생했습니다.");
    });
  }

  private setupGraphQLSubscriptions() {
    if (!this.apolloClient || !this.sessionId) return;

    // Transcription updates subscription
    const transcriptionSub = this.apolloClient
      .subscribe({
        query: TRANSCRIPTION_UPDATED_SUBSCRIPTION,
        variables: { sessionId: this.sessionId },
      })
      .subscribe({
        next: (result: any) => {
          console.log(
            "STT Result (GraphQL):",
            result.data?.transcriptionUpdated
          );
          if (result.data?.transcriptionUpdated) {
            this.config?.onTranscriptionUpdate(
              result.data.transcriptionUpdated
            );
          }
        },
        error: (error: any) => {
          console.error("GraphQL subscription error:", error);
          this.config?.onError("구독 연결 오류가 발생했습니다.");
        },
      });

    // Recording session updates subscription
    const sessionSub = this.apolloClient
      .subscribe({
        query: RECORDING_SESSION_UPDATED_SUBSCRIPTION,
        variables: { sessionId: this.sessionId },
      })
      .subscribe({
        next: (result: any) => {
          console.log(
            "Session Update (GraphQL):",
            result.data?.recordingSessionUpdated
          );
          if (result.data?.recordingSessionUpdated) {
            this.config?.onSessionUpdate(result.data.recordingSessionUpdated);
          }
        },
        error: (error: any) => {
          console.error("Session subscription error:", error);
        },
      });

    this.subscriptions.push(transcriptionSub, sessionSub);
  }

  initialize(config: AudioServiceConfig) {
    this.config = config;
    this.setupSocketConnection();
  }

  async startRecording(sessionId: string): Promise<boolean> {
    try {
      this.sessionId = sessionId;
      this.chunkIndex = 0;

      // 마이크 권한 요청
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        this.config?.onError("마이크 권한이 필요합니다.");
        return false;
      }

      // 오디오 모드 설정
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // GraphQL 세션 시작
      if (this.apolloClient) {
        await this.apolloClient.mutate({
          mutation: START_RECORDING_SESSION,
          variables: { sessionId },
        });
      }

      // Socket 세션 시작
      this.socket?.emit("startRecording", { sessionId });

      // GraphQL 구독 설정
      this.setupGraphQLSubscriptions();

      // 녹음 시작
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;

      // 실시간 오디오 스트리밍
      this.startAudioStreaming();

      return true;
    } catch (error) {
      console.error("Failed to start recording:", error);
      this.config?.onError("녹음을 시작할 수 없습니다.");
      return false;
    }
  }

  private async startAudioStreaming() {
    if (!this.recording || !this.sessionId) {
      return;
    }

    try {
      let lastDuration = 0;

      // 실시간 오디오 데이터 처리를 위한 설정
      this.recording.setOnRecordingStatusUpdate(async (status) => {
        console.log({ status });
        if (
          status.isRecording &&
          status.durationMillis &&
          status.durationMillis > lastDuration + 1000
        ) {
          // 1초마다 처리
          lastDuration = status.durationMillis;

          try {
            // 현재까지의 녹음 데이터를 가져와서 처리
            const uri = this.recording?.getURI();
            console.log({ uri });
            if (uri && this.sessionId) {
              // 오디오 파일을 base64로 인코딩
              const audioData = await this.getAudioDataFromUri(uri);

              if (audioData) {
                // 큰 오디오 파일을 청크 단위로 분할하여 전송
                const chunkSize = 4096; // 4KB 청크
                const chunks = this.splitAudioIntoChunks(audioData, chunkSize);

                for (let i = 0; i < chunks.length; i++) {
                  // Socket을 통한 실시간 전송
                  this.socket?.emit("audioChunk", {
                    sessionId: this.sessionId,
                    audioData: chunks[i],
                    chunkIndex: this.chunkIndex++,
                    timestamp: status.durationMillis,
                    isPartial: i < chunks.length - 1,
                  });

                  // 너무 빠르게 전송하지 않도록 약간의 딜레이
                  await new Promise((resolve) => setTimeout(resolve, 50));
                }

                // GraphQL을 통한 전송 (마지막 청크만)
                if (this.apolloClient && chunks.length > 0) {
                  await this.apolloClient.mutate({
                    mutation: PROCESS_AUDIO_DATA,
                    variables: {
                      sessionId: this.sessionId,
                      audioData: chunks[chunks.length - 1],
                      chunkIndex: this.chunkIndex,
                    },
                  });
                }
              }
            }
          } catch (error) {
            console.error("Audio chunk processing error:", error);
          }
        }
      });

      // 녹음 상태 업데이트 간격 설정 (500ms마다 체크)
      this.recording.setProgressUpdateInterval(500);
    } catch (error) {
      console.error("Audio streaming setup error:", error);
      this.config?.onError("오디오 스트리밍 설정에 실패했습니다.");
    }
  }

  private splitAudioIntoChunks(audioData: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < audioData.length; i += chunkSize) {
      chunks.push(audioData.substring(i, i + chunkSize));
    }
    return chunks;
  }

  private async getAudioDataFromUri(uri: string): Promise<string | null> {
    try {
      // Expo FileSystem을 사용하여 오디오 파일을 base64로 읽기
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });
      return base64Data;
    } catch (error) {
      console.error("Failed to read audio file:", error);
      return null;
    }
  }

  private generateFakeAudioData(): string {
    // 가짜 오디오 데이터 생성 (base64)
    const buffer = Buffer.alloc(1024);
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    return buffer.toString("base64");
  }

  async stopRecording(): Promise<boolean> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }

      if (this.sessionId) {
        // GraphQL 세션 종료
        if (this.apolloClient) {
          await this.apolloClient.mutate({
            mutation: STOP_RECORDING_SESSION,
            variables: { sessionId: this.sessionId },
          });
        }

        // Socket 세션 종료
        this.socket?.emit("stopRecording", { sessionId: this.sessionId });
      }

      // 구독 정리
      this.subscriptions.forEach((sub) => sub.unsubscribe());
      this.subscriptions = [];

      this.sessionId = null;
      this.chunkIndex = 0;

      return true;
    } catch (error) {
      console.error("Failed to stop recording:", error);
      this.config?.onError("녹음을 중지할 수 없습니다.");
      return false;
    }
  }

  disconnect() {
    this.socket?.disconnect();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];
  }
}

export const audioService = new AudioService();

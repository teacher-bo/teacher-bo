import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { TranscribeService } from './transcribe.service';

interface AudioChunkData {
  audioData: string; // base64 encoded audio
  timestamp: number;
  soundLevel: number;
}

@WebSocketGateway({
  transports: ['websocket'],
  // namespace: 'audio',
})
export class AudioGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AudioGateway.name);
  private clientVadFlags = new Map<string, boolean>();

  constructor(private transcribeService: TranscribeService) {
    // TranscribeService의 EventEmitter를 Redis PubSub으로 연결
    this.setupEventRelay();
  }

  private setupEventRelay() {
    const eventEmitter = this.transcribeService.getEventEmitter();

    eventEmitter.on('transcription', (data) => {
      this.logger.log(`📡 Publishing transcription event to Redis:`, data);
      this.emitToClient(data.clientId, 'transcriptionResult', data);

      // 콘솔에도 로그 출력
      this.logger.log(`STT Result [${data.clientId}]: ${data.text}`);
    });

    eventEmitter.on('vadEnded', (data) => {
      this.logger.log(`🎙️ VAD ended event received:`, data);

      // vad가 true인 connection은 vadEnded 이벤트를 받지 않음
      const clientVadEnabled = this.clientVadFlags.get(data.clientId);
      if (clientVadEnabled) {
        this.logger.log(
          `Skipping vadEnded event for client ${data.clientId} (VAD enabled)`,
        );
        return;
      }

      this.emitToClient(data.clientId, 'vadEnded', {
        timestamp: data.timestamp,
        confidence: data.confidence,
        message: '음성 활동이 종료되었습니다.',
      });
    });
  }

  handleConnection(client: Socket) {
    const vad = client.handshake.query.vad === 'true';
    this.clientVadFlags.set(client.id, vad);
    this.logger.log(`Client connected: ${client.id}, VAD enabled: ${vad}`);
  }

  handleDisconnect(client: Socket) {
    this.clientVadFlags.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('audioChunk')
  async handleAudioChunk(
    @MessageBody() data: AudioChunkData,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(
        `Received audio chunk at ${data.timestamp} for client: ${client.id}`,
      );

      // base64 디코딩
      const audioBuffer = Buffer.from(data.audioData, 'base64');

      // 첫 오디오 청크 받을 때 자동으로 스트림 시작됨
      this.transcribeService.addAudioChunk(client.id, audioBuffer);
    } catch (error) {
      this.logger.error(`Error processing audio chunk:`, error);

      client.emit('transcriptionError', {
        error: 'Failed to process audio chunk',
        timestamp: data.timestamp,
      });
    }
  }

  @SubscribeMessage('stopTranscriptionStream')
  async stopTranscriptionStream(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Stopping recording session: ${data.sessionId} for client: ${client.id}`,
    );

    // AWS Transcribe 스트림이 완전히 종료될 때까지 대기
    await this.transcribeService.stopTranscriptionStream(client.id);

    // 클라이언트에게 녹음 종료 확인 전송
    client.emit('recordingStopped', {
      sessionId: data.sessionId,
      status: 'stopped',
      message: '음성 녹음이 종료되었습니다.',
    });
  }

  // GraphQL Subscription에서 사용할 수 있도록 외부에서 호출 가능한 메서드
  emitToClient(clientId: string, event: string, data: any) {
    const socket = this.server.sockets.sockets.get(clientId);
    if (socket) {
      socket.emit(event, data);
    }
  }
}

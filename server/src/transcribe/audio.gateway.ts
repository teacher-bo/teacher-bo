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
import { Logger } from '@nestjs/common';
import { TranscribeService } from './transcribe.service';

interface AudioChunkData {
  audioData: string;
  timestamp: number;
  soundLevel: number;
}

interface TranscriptionRelayData {
  clientId: string;
  text: string;
  [key: string]: unknown;
}

interface VadEndedRelayData {
  clientId: string;
  timestamp: number;
  confidence: number;
}

interface StopTranscriptionData {
  sessionId?: string;
}

const clientOrigins = (process.env.CLIENT_URL ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

@WebSocketGateway({
  transports: ['websocket'],
  cors: {
    origin: clientOrigins.length > 0 ? clientOrigins : true,
    credentials: true,
  },
})
export class AudioGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AudioGateway.name);
  private clientVadFlags = new Map<string, boolean>();

  constructor(private transcribeService: TranscribeService) {
    this.setupEventRelay();
  }

  private _vadEnabled(clientId: string): boolean {
    return this.clientVadFlags.get(clientId) ?? false;
  }

  private setupEventRelay() {
    const eventEmitter = this.transcribeService.getEventEmitter();

    eventEmitter.on('transcription', (data: TranscriptionRelayData) => {
      this.emitToClient(data.clientId, 'transcriptionResult', data);

      this.logger.log(`STT Result [${data.clientId}]: ${data.text}`);
    });

    eventEmitter.on('vadEnded', (data: VadEndedRelayData) => {
      this.logger.log(`🎙️ VAD ended event received:`, data);

      if (!this._vadEnabled(data.clientId)) {
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

      const audioBuffer = Buffer.from(data.audioData, 'base64');

      this.transcribeService.addAudioChunk(
        client.id,
        audioBuffer,
        this._vadEnabled(client.id),
      );
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
    @MessageBody() data: StopTranscriptionData,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Stopping recording session: ${data.sessionId} for client: ${client.id}`,
    );

    await this.transcribeService.stopTranscriptionStream(client.id);

    client.emit('recordingStopped', {
      sessionId: data.sessionId,
      status: 'stopped',
      message: '음성 녹음이 종료되었습니다.',
    });
  }

  emitToClient(
    clientId: string,
    event: string,
    data: Record<string, unknown>,
  ) {
    const socket = this.server.sockets.sockets.get(clientId);
    if (socket) {
      socket.emit(event, data);
    }
  }
}

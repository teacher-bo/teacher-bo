import {
  Resolver,
  Subscription,
  Mutation,
  Args,
  ObjectType,
  Field,
} from '@nestjs/graphql';
import { Injectable, Logger } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { TranscribeService } from './transcribe.service';

const pubSub = new RedisPubSub({
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    password: process.env.REDIS_PASSWORD || '',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

// GraphQL Types
@ObjectType()
export class TranscriptionResult {
  @Field()
  sessionId: string;

  @Field()
  text: string;

  @Field()
  timestamp: string;

  @Field()
  isFinal: boolean;
}

@ObjectType()
export class StreamStatus {
  @Field()
  sessionId: string;

  @Field()
  status: string;

  @Field()
  message: string;
}

@Injectable()
@Resolver()
export class TranscribeResolver {
  private readonly logger = new Logger(TranscribeResolver.name);

  constructor(private transcribeService: TranscribeService) {
    // TranscribeService의 EventEmitter를 Redis PubSub으로 연결
    this.setupEventRelay();
  }

  private setupEventRelay() {
    const eventEmitter = this.transcribeService.getEventEmitter();

    eventEmitter.on('transcription', (data) => {
      this.logger.log(`📡 Publishing transcription event to Redis:`, data);
      pubSub.publish('TRANSCRIPTION_UPDATED', { transcriptionStream: data });
    });
  }

  @Mutation(() => StreamStatus)
  async startTranscriptionStream(
    @Args('sessionId') sessionId: string,
  ): Promise<StreamStatus> {
    this.logger.log(`Starting transcription stream for session: ${sessionId}`);

    try {
      await this.transcribeService.startTranscriptionStream(sessionId);

      return {
        sessionId,
        status: 'started',
        message: 'Transcription stream started successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to start transcription stream: ${error.message}`,
      );
      return {
        sessionId,
        status: 'error',
        message: `Failed to start transcription stream: ${error.message}`,
      };
    }
  }

  @Mutation(() => StreamStatus)
  async stopTranscriptionStream(
    @Args('sessionId') sessionId: string,
  ): Promise<StreamStatus> {
    this.logger.log(`Stopping transcription stream for session: ${sessionId}`);

    this.transcribeService.stopTranscriptionStream(sessionId);

    return {
      sessionId,
      status: 'stopped',
      message: 'Transcription stream stopped successfully',
    };
  }

  @Mutation(() => Boolean)
  async addAudioChunk(
    @Args('sessionId') sessionId: string,
    @Args('audioData') audioData: string,
  ): Promise<boolean> {
    try {
      // Base64 디코딩
      const audioBuffer = Buffer.from(audioData, 'base64');

      // 오디오 청크를 스트림에 추가
      this.transcribeService.addAudioChunk(sessionId, audioBuffer);

      return true;
    } catch (error) {
      this.logger.error(`Error adding audio chunk: ${error.message}`);
      return false;
    }
  }

  @Subscription(() => TranscriptionResult, {
    filter: (payload, variables) => {
      const matches =
        payload.transcriptionStream.sessionId === variables.sessionId;
      console.log(
        `🔍 Filter check: ${payload.transcriptionStream.sessionId} === ${variables.sessionId} = ${matches}`,
      );
      return matches;
    },
  })
  transcriptionStream(@Args('sessionId') sessionId: string) {
    // 클라이언트가 구독할 때 로그 출력
    this.logger.log(
      `� Client subscribed to transcription stream for session: ${sessionId}`,
    );

    return pubSub.asyncIterator(['TRANSCRIPTION_UPDATED']);
  }
}

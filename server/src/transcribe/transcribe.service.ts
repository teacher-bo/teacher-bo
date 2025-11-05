import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  LanguageCode,
  MediaEncoding,
} from '@aws-sdk/client-transcribe-streaming';
import { EventEmitter } from 'events';
import * as FormData from 'form-data';
import axios from 'axios';

@Injectable()
export class TranscribeService {
  private readonly logger = new Logger(TranscribeService.name);
  private readonly transcribeStreamingClient: TranscribeStreamingClient;
  private readonly eventEmitter = new EventEmitter();
  private readonly vadServiceUrl = 'http://localhost:1003';

  // 세션별 오디오 스트림 관리
  private audioBuffers = new Map<string, Buffer[]>();
  private isTranscribing = new Map<string, boolean>();
  private transcribePromises = new Map<string, Promise<void>>();

  constructor(private configService: ConfigService) {
    const awsConfig = {
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    };

    this.transcribeStreamingClient = new TranscribeStreamingClient(awsConfig);
  }

  // 새로운 transcription 스트림 시작 (내부에서 자동 호출됨)
  private async startTranscriptionStream(clientId: string): Promise<void> {
    this.logger.log(`Starting transcription stream for client: ${clientId}`);

    if (this.isTranscribing.get(clientId)) {
      this.logger.warn(
        `Transcription already active for client: ${clientId}, skipping`,
      );
      return;
    }

    this.isTranscribing.set(clientId, true);
    this.audioBuffers.set(clientId, []);

    // AWS Transcribe 스트림 설정
    const transcribePromise = this.setupAWSTranscribeStream(clientId);
    this.transcribePromises.set(clientId, transcribePromise);
  }

  // AWS Transcribe 스트림 설정 (참고 코드 패턴 적용)
  private async setupAWSTranscribeStream(clientId: string): Promise<void> {
    try {
      let buffer = Buffer.from('');

      // 오디오 스트림 제너레이터 (참고 코드 패턴)
      const audioStream = async function* (service: TranscribeService) {
        while (service.isTranscribing.get(clientId)) {
          // 새로운 오디오 청크 대기
          const chunk = await new Promise<Buffer | null>((resolve) => {
            const checkBuffer = () => {
              const buffers = service.audioBuffers.get(clientId);
              if (buffers && buffers.length > 0) {
                const audioChunk = buffers.shift()!;
                resolve(audioChunk);
              } else if (!service.isTranscribing.get(clientId)) {
                resolve(null);
              } else {
                // 100ms 후 다시 확인
                setTimeout(checkBuffer, 100);
              }
            };
            checkBuffer();
          });

          if (chunk === null) break;

          buffer = Buffer.concat([buffer, chunk]);
          console.log('Received audio chunk, buffer size:', buffer.length);

          // 1024 바이트씩 yield (참고 코드 패턴)
          while (buffer.length >= 1024) {
            yield { AudioEvent: { AudioChunk: buffer.slice(0, 1024) } };
            buffer = buffer.slice(1024);
          }
        }

        // 남은 버퍼가 있다면 마지막으로 전송
        if (buffer.length > 0) {
          yield { AudioEvent: { AudioChunk: buffer } };
        }
      };

      // AWS Transcribe 명령 설정
      const command = new StartStreamTranscriptionCommand({
        LanguageCode: LanguageCode.KO_KR,
        MediaSampleRateHertz: 16000,
        MediaEncoding: MediaEncoding.PCM,
        AudioStream: audioStream(this),
        // VocabularyName: 'TeacherBo',
      });

      this.logger.log('Sending command to AWS Transcribe');
      const response = await this.transcribeStreamingClient.send(command);
      this.logger.log('Received response from AWS Transcribe');

      // Transcription 결과 처리
      let lastTranscript = '';

      for await (const event of response.TranscriptResultStream) {
        if (!this.isTranscribing.get(clientId)) break;

        if (event.TranscriptEvent) {
          this.logger.log(
            'Received TranscriptEvent:',
            JSON.stringify(event.TranscriptEvent),
          );

          const results = event.TranscriptEvent.Transcript?.Results;
          if (
            results &&
            results.length > 0 &&
            results[0].Alternatives &&
            results[0].Alternatives.length > 0
          ) {
            const transcript = results[0].Alternatives[0].Transcript || '';
            const isFinal = !results[0].IsPartial;

            const transcriptionEvent = {
              clientId,
              resultId: results[0].ResultId,
              text: isFinal
                ? transcript
                : transcript.substring(lastTranscript.length),
              isFinal,
              timestamp: new Date().toISOString(),
            };

            if (transcriptionEvent.text.trim() !== '') {
              this.eventEmitter.emit('transcription', transcriptionEvent);
              this.logger.log(
                '📡 Emitting transcription event:',
                transcriptionEvent,
              );
            }

            if (isFinal) {
              lastTranscript = transcript;
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Transcription error:', error);
      this.eventEmitter.emit('transcriptionError', {
        clientId,
        error: error.message,
      });
    }
  }

  // 오디오 청크 추가 (첫 청크 받을 때 자동으로 스트림 시작)
  addAudioChunk(clientId: string, audioData: Buffer): void {
    // 스트림이 아직 시작되지 않았다면 시작
    if (!this.isTranscribing.get(clientId)) {
      this.logger.log(
        `🎬 First audio chunk received, auto-starting transcription stream for client: ${clientId}`,
      );
      this.startTranscriptionStream(clientId).catch((error) => {
        this.logger.error(
          `Failed to auto-start transcription stream: ${error.message}`,
        );
      });
    }

    if (this.isTranscribing.get(clientId)) {
      this.logger.log(
        `Adding audio chunk for client ${clientId}, size: ${audioData.length} bytes`,
      );

      const buffers = this.audioBuffers.get(clientId);
      if (buffers) {
        buffers.push(audioData);
      }

      // VAD 서비스로 오디오 전송
      this.sendAudioToVAD(clientId, audioData);
    } else {
      this.logger.warn(`No active transcription for client: ${clientId}`);
    }
  }

  // VAD 서비스로 오디오 전송
  private async sendAudioToVAD(
    clientId: string,
    audioData: Buffer,
  ): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('audio', audioData, {
        filename: 'audio.pcm',
        contentType: 'application/octet-stream',
      });

      const response = await axios.post(
        `${this.vadServiceUrl}/detect`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 5000,
        },
      );

      const { has_speech, speech_ended, confidence } = response.data;

      this.logger.log(
        `VAD Result for ${clientId} - Speech: ${has_speech}, Ended: ${speech_ended}, Confidence: ${confidence}`,
      );

      // speech_ended가 true이면 클라이언트에게 이벤트 전송
      if (speech_ended) {
        this.eventEmitter.emit('vadEnded', {
          clientId,
          timestamp: new Date().toISOString(),
          confidence,
        });
        this.logger.log(`🎙️ VAD ended event emitted for client: ${clientId}`);
      }
    } catch (error) {
      // VAD 서비스 오류는 로그만 남기고 계속 진행
      this.logger.warn(`VAD service error: ${error.message}`);
    }
  }

  // transcription 스트림 중지
  async stopTranscriptionStream(clientId: string): Promise<void> {
    this.logger.log(`Stopping transcription stream for client: ${clientId}`);

    // 1. 먼저 플래그를 false로 설정 (새로운 청크 수신 중지)
    this.isTranscribing.set(clientId, false);

    // 2. 진행 중인 AWS Transcribe Promise가 완료될 때까지 대기
    const transcribePromise = this.transcribePromises.get(clientId);
    if (transcribePromise) {
      try {
        this.logger.log(
          `⏳ Waiting for AWS Transcribe stream to finish for client: ${clientId}`,
        );
        await transcribePromise;
        this.logger.log(
          `✅ AWS Transcribe stream finished for client: ${clientId}`,
        );
      } catch (error) {
        this.logger.warn(
          `AWS Transcribe stream ended with error for client: ${clientId}`,
          error.message,
        );
      }
    }

    // 3. 리소스 정리
    this.audioBuffers.delete(clientId);
    this.transcribePromises.delete(clientId);

    this.logger.log(
      `🛑 Transcription stream fully stopped for client: ${clientId}`,
    );
  }

  // 활성 세션 확인
  isSessionActive(clientId: string): boolean {
    return this.isTranscribing.get(clientId) || false;
  }

  // EventEmitter 접근을 위한 메서드
  getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }
}

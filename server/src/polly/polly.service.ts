import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PollyClient,
  SynthesizeSpeechCommand,
  VoiceId,
  Engine,
  OutputFormat,
  LanguageCode,
} from '@aws-sdk/client-polly';

export interface SynthesizeSpeechOptions {
  text: string;
  voiceId?: VoiceId;
  engine?: Engine;
  outputFormat?: OutputFormat;
  sampleRate?: string;
  languageCode?: LanguageCode;
}

@Injectable()
export class PollyService {
  private readonly logger = new Logger(PollyService.name);
  private readonly pollyClient: PollyClient;

  constructor(private configService: ConfigService) {
    this.pollyClient = new PollyClient({
      region: this.configService.get<string>('AWS_REGION', 'ap-northeast-2'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  async synthesizeSpeech(options: SynthesizeSpeechOptions): Promise<Buffer> {
    try {
      const {
        text,
        voiceId = VoiceId.Seoyeon, // 한국어 여성 목소리
        engine = Engine.NEURAL,
        outputFormat = OutputFormat.MP3,
        sampleRate = '22050',
        languageCode = LanguageCode.ko_KR,
      } = options;
      
      const ssmlText = this.buildSsml(text, {
        language: 'ko-KR',
      });

      const command = new SynthesizeSpeechCommand({
        Text: ssmlText,
        TextType: 'ssml', 
        VoiceId: voiceId,
        Engine: engine,
        OutputFormat: outputFormat,
        SampleRate: sampleRate,
        LanguageCode: languageCode,
      });

      this.logger.debug(
        `Synthesizing speech for text: ${text.substring(0, 50)}...`,
      );

      const response = await this.pollyClient.send(command);

      if (!response.AudioStream) {
        throw new BadRequestException('Failed to generate audio stream');
      }

      // AudioStream을 Buffer로 변환
      const chunks: Buffer[] = [];
      const stream = response.AudioStream as NodeJS.ReadableStream;

      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const audioBuffer = Buffer.concat(chunks);

      this.logger.debug(
        `Successfully synthesized speech, audio size: ${audioBuffer.length} bytes`,
      );

      return audioBuffer;
    } catch (error) {
      this.logger.error('Failed to synthesize speech', error);
      throw new BadRequestException('Failed to synthesize speech');
    }
  }
  
  /**
   * Plain text를 받아 간단한 SSML로 감싸서 반환합니다.
   * - XML 특수문자 이스케이프
   */
  
  buildSsml(
    text: string,
    opts?: { language?: string },
  ): string {
    const escapeXml = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    let body = escapeXml(text);
    const langAttr = opts?.language ? ` xml:lang="${opts.language}"` : '';
    // return `<speak${langAttr}> <prosody rate="x-fast"> ${body}</prosody> </speak>`;
    return `<speak${langAttr}> ${body} </speak>`;
  }

  // async synthesizeSpeechAsBase64(
  //   options: SynthesizeSpeechOptions,
  // ): Promise<string> {
  //   const audioBuffer = await this.synthesizeSpeech(options);
  //   return audioBuffer.toString('base64');
  // }

  // 사용 가능한 한국어 음성 목록
  getAvailableKoreanVoices(): Array<{
    id: VoiceId;
    name: string;
    gender: string;
    engine: Engine[];
  }> {
    return [
      {
        id: VoiceId.Seoyeon,
        name: '서연',
        gender: 'Female',
        engine: [Engine.NEURAL, Engine.STANDARD],
      },
    ];
  }
}

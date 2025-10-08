import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { PollyService } from './polly.service';
import {
  SynthesizeSpeechInput,
  SynthesizeSpeechResponse,
  AvailableVoice,
} from './polly.types';

@Resolver()
export class PollyResolver {
  private readonly logger = new Logger(PollyResolver.name);

  constructor(private readonly pollyService: PollyService) {}

  @Mutation(() => SynthesizeSpeechResponse, {
    description: 'AWS Polly를 사용하여 텍스트를 음성으로 변환합니다',
  })
  async synthesizeSpeech(
    @Args('input') input: SynthesizeSpeechInput,
  ): Promise<SynthesizeSpeechResponse> {
    this.logger.debug(
      `Synthesizing speech for: ${input.text.substring(0, 50)}...`,
    );

    const audioBuffer = await this.pollyService.synthesizeSpeech({
      text: input.text,
      voiceId: input.voiceId,
      engine: input.engine,
      outputFormat: input.outputFormat,
      sampleRate: input.sampleRate,
      languageCode: input.languageCode,
    });

    const audioBase64 = audioBuffer.toString('base64');
    const contentType =
      input.outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav';

    return {
      audioBase64,
      contentType,
      audioSize: audioBuffer.length,
    };
  }

  @Query(() => [AvailableVoice], {
    description: '사용 가능한 한국어 음성 목록을 조회합니다',
  })
  async getAvailableKoreanVoices(): Promise<AvailableVoice[]> {
    const voices = this.pollyService.getAvailableKoreanVoices();

    return voices.map((voice) => ({
      id: voice.id,
      name: voice.name,
      gender: voice.gender,
      engine: voice.engine.map((e) => e.toString()),
    }));
  }
}

import { Field, ObjectType, InputType } from '@nestjs/graphql';
import {
  VoiceId,
  Engine,
  OutputFormat,
  LanguageCode,
} from '@aws-sdk/client-polly';
import { IsOptional, IsString } from 'class-validator';

@ObjectType()
export class SynthesizeSpeechResponse {
  @Field()
  audioBase64: string;

  @Field()
  contentType: string;

  @Field()
  audioSize: number;
}

@InputType()
export class SynthesizeSpeechInput {
  @Field()
  @IsString()
  text: string;

  @Field(() => String, { nullable: true, defaultValue: VoiceId.Seoyeon })
  @IsString()
  @IsOptional()
  voiceId?: VoiceId;

  @Field(() => String, { nullable: true, defaultValue: Engine.NEURAL })
  @IsString()
  @IsOptional()
  engine?: Engine;

  @Field(() => String, { nullable: true, defaultValue: OutputFormat.MP3 })
  @IsString()
  @IsOptional()
  outputFormat?: OutputFormat;

  @Field(() => String, { nullable: true, defaultValue: '22050' })
  @IsString()
  @IsOptional()
  sampleRate?: string;

  @Field(() => String, { nullable: true, defaultValue: LanguageCode.ko_KR })
  @IsString()
  @IsOptional()
  languageCode?: LanguageCode;
}

@ObjectType()
export class AvailableVoice {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  gender: string;

  @Field(() => [String])
  engine: string[];
}

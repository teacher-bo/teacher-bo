import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIService } from './openai.service';
import { OpenAIResolver } from './openai.resolver';

@Module({
  imports: [ConfigModule],
  providers: [OpenAIService, OpenAIResolver],
  exports: [OpenAIService],
})
export class OpenAIModule {}

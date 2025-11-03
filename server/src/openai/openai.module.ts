import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { OpenAIService } from './openai.service';
import { OpenAIResolver } from './openai.resolver';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [OpenAIService, OpenAIResolver],
  exports: [OpenAIService],
})
export class OpenAIModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TranscribeService } from './transcribe.service';
import { TranscribeResolver } from './transcribe.resolver';
import { AudioGateway } from './audio.gateway';

@Module({
  imports: [ConfigModule],
  providers: [TranscribeService, TranscribeResolver, AudioGateway],
  exports: [TranscribeService],
})
export class TranscribeModule {}

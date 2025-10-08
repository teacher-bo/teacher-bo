import { Module } from '@nestjs/common';
import { PollyService } from './polly.service';
import { PollyResolver } from './polly.resolver';

@Module({
  providers: [PollyService, PollyResolver],
  exports: [PollyService],
})
export class PollyModule {}

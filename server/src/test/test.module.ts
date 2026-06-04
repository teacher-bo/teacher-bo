import { Module } from '@nestjs/common';

import { WhisperTestController } from './whisper-test.controller';
import { WhisperTestService } from './whisper-test.service';

@Module({
  controllers: [WhisperTestController],
  providers: [WhisperTestService],
})
export class TestModule {}

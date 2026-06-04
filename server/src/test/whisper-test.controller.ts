import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { WhisperTestService } from './whisper-test.service';
import {
  WhisperTestRequestBody,
  WhisperTestResult,
} from './whisper-test.types';

@Controller('api/test/whisper')
export class WhisperTestController {
  constructor(private readonly whisperTestService: WhisperTestService) {}

  @Get('health')
  async health(): Promise<{ ok: boolean; serviceUrl: string; model: string }> {
    return this.whisperTestService.health();
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: memoryStorage(),
      limits: {
        fileSize: 30 * 1024 * 1024,
      },
    }),
  )
  async transcribe(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: WhisperTestRequestBody,
  ): Promise<WhisperTestResult> {
    return this.whisperTestService.transcribe(file, body);
  }
}

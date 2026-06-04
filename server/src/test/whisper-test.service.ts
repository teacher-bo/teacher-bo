import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import * as FormData from 'form-data';

import {
  WhisperTestRequestBody,
  WhisperTestResult,
  WhisperTestSegment,
} from './whisper-test.types';

interface WhisperCppSegmentRecord {
  id?: unknown;
  start?: unknown;
  start_ms?: unknown;
  end?: unknown;
  end_ms?: unknown;
  text?: unknown;
}

@Injectable()
export class WhisperTestService {
  private readonly defaultLanguage = 'ko';

  constructor(private readonly configService: ConfigService) {}

  async transcribe(
    file: Express.Multer.File | undefined,
    body: WhisperTestRequestBody,
  ): Promise<WhisperTestResult> {
    if (!file) {
      throw new BadRequestException('audio file is required');
    }

    const startedAt = Date.now();
    const language = this.normalizeLanguage(body.language);
    const serviceUrl = this.getServiceUrl();
    const formData = new FormData();

    formData.append('file', file.buffer, {
      filename: file.originalname || 'teacher-bo-test-audio',
      contentType: file.mimetype || 'application/octet-stream',
    });
    formData.append('response_format', 'json');
    formData.append('language', language);
    formData.append('temperature', this.normalizeTemperature(body.temperature));
    formData.append('temperature_inc', '0.2');

    const prompt = body.prompt?.trim();
    if (prompt) {
      formData.append('prompt', prompt);
    }

    try {
      const response = await axios.post<unknown>(
        `${serviceUrl}/inference`,
        formData,
        {
          headers: formData.getHeaders(),
          maxBodyLength: Infinity,
          timeout: 180000,
        },
      );

      return {
        text: this.extractText(response.data),
        segments: this.extractSegments(response.data),
        durationMs: Date.now() - startedAt,
        model: this.configService.get<string>('STT_MODEL', 'small'),
        language,
        serviceUrl,
      };
    } catch (error) {
      throw new ServiceUnavailableException(this.formatWhisperError(error));
    }
  }

  async health(): Promise<{ ok: boolean; serviceUrl: string; model: string }> {
    const serviceUrl = this.getServiceUrl();

    try {
      await axios.get(`${serviceUrl}/health`, { timeout: 5000 });

      return {
        ok: true,
        serviceUrl,
        model: this.configService.get<string>('STT_MODEL', 'small'),
      };
    } catch {
      return {
        ok: false,
        serviceUrl,
        model: this.configService.get<string>('STT_MODEL', 'small'),
      };
    }
  }

  private getServiceUrl(): string {
    const configured =
      this.configService.get<string>('STT_SERVER_URL') ||
      this.configService.get<string>('WHISPER_SERVER_URL');

    return (configured || 'http://whisper:8098').replace(/\/$/, '');
  }

  private normalizeLanguage(language: string | undefined): string {
    const value = language?.trim();

    if (!value) {
      return this.defaultLanguage;
    }

    return value;
  }

  private normalizeTemperature(temperature: string | undefined): string {
    const value = Number(temperature);

    if (!Number.isFinite(value) || value < 0 || value > 1) {
      return '0.0';
    }

    return value.toFixed(1);
  }

  private extractText(data: unknown): string {
    if (typeof data === 'string') {
      return data.trim();
    }

    if (!this.isRecord(data)) {
      return '';
    }

    const text = data.text;
    if (typeof text === 'string') {
      return text.trim();
    }

    const transcription = data.transcription;
    if (typeof transcription === 'string') {
      return transcription.trim();
    }

    return '';
  }

  private extractSegments(data: unknown): WhisperTestSegment[] {
    if (!this.isRecord(data) || !Array.isArray(data.segments)) {
      return [];
    }

    return data.segments
      .map((segment, index) => this.normalizeSegment(segment, index))
      .filter((segment): segment is WhisperTestSegment => segment !== null);
  }

  private normalizeSegment(
    value: unknown,
    index: number,
  ): WhisperTestSegment | null {
    if (!this.isRecord(value)) {
      return null;
    }

    const segment = value as WhisperCppSegmentRecord;
    const text = typeof segment.text === 'string' ? segment.text.trim() : '';

    if (!text) {
      return null;
    }

    return {
      id: this.toNumber(segment.id) ?? index,
      startMs: this.toTimestampMs(segment.start_ms ?? segment.start),
      endMs: this.toTimestampMs(segment.end_ms ?? segment.end),
      text,
    };
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private toTimestampMs(value: unknown): number | null {
    const numberValue = this.toNumber(value);

    if (numberValue === null) {
      return null;
    }

    return numberValue > 1000
      ? Math.round(numberValue)
      : Math.round(numberValue * 1000);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private formatWhisperError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<unknown>;
      const detail = this.extractAxiosErrorDetail(axiosError.response?.data);

      if (detail) {
        return `whisper.cpp request failed: ${detail}`;
      }

      return `whisper.cpp request failed: ${axiosError.message}`;
    }

    if (error instanceof Error) {
      return `whisper.cpp request failed: ${error.message}`;
    }

    return 'whisper.cpp request failed';
  }

  private extractAxiosErrorDetail(data: unknown): string | null {
    if (typeof data === 'string') {
      return data.slice(0, 400);
    }

    if (!this.isRecord(data)) {
      return null;
    }

    const message = data.message ?? data.error ?? data.detail;

    if (typeof message === 'string') {
      return message.slice(0, 400);
    }

    return null;
  }
}

import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';
import { Readable } from 'stream';

import { WhisperTestService } from './whisper-test.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WhisperTestService', () => {
  let service: WhisperTestService;

  beforeEach(() => {
    jest.resetAllMocks();

    const configValues: Record<string, string> = {
      STT_SERVER_URL: 'http://whisper:8098',
      STT_MODEL: 'small',
    };
    const configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        return configValues[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    service = new WhisperTestService(configService);
  });

  it('forwards uploaded audio to whisper.cpp and normalizes the response', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        text: ' 루미큐브는 14개로 시작합니다. ',
        segments: [
          {
            id: 7,
            start: 0.5,
            end: 2.25,
            text: '루미큐브는 14개로 시작합니다.',
          },
        ],
      },
    });

    const result = await service.transcribe(createAudioFile(), {
      language: 'ko',
      prompt: '보드게임 설명',
      temperature: '0.3',
    });

    const [url, payload, config] = mockedAxios.post.mock.calls[0];

    expect(url).toBe('http://whisper:8098/inference');
    expect(typeof (payload as FormData).getHeaders).toBe('function');
    expect(config?.timeout).toBe(180000);
    expect(result.text).toBe('루미큐브는 14개로 시작합니다.');
    expect(result.segments).toEqual([
      {
        id: 7,
        startMs: 500,
        endMs: 2250,
        text: '루미큐브는 14개로 시작합니다.',
      },
    ]);
    expect(result.model).toBe('small');
    expect(result.language).toBe('ko');
  });

  it('rejects missing audio files', async () => {
    await expect(service.transcribe(undefined, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('reports whisper.cpp health with configured service URL', async () => {
    mockedAxios.get.mockResolvedValue({ data: '' });

    await expect(service.health()).resolves.toEqual({
      ok: true,
      serviceUrl: 'http://whisper:8098',
      model: 'small',
    });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://whisper:8098/health',
      { timeout: 5000 },
    );
  });
});

function createAudioFile(): Express.Multer.File {
  const buffer = Buffer.from([1, 2, 3, 4]);

  return {
    fieldname: 'audio',
    originalname: 'sample.wav',
    encoding: '7bit',
    mimetype: 'audio/wav',
    size: buffer.length,
    buffer,
    stream: Readable.from(buffer),
    destination: '',
    filename: '',
    path: '',
  };
}

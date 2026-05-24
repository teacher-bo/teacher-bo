import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { OpenAIService } from './openai.service';

describe('OpenAIService', () => {
  const ragServerUrl = 'http://teacher-bo-rag:8096';

  const createService = () => {
    const configService = {
      get: jest.fn((key: string) =>
        key === 'RAG_SERVER_URL' ? ragServerUrl : undefined,
      ),
    } as unknown as ConfigService;
    const post = jest.fn();
    const get = jest.fn();
    const deleteRequest = jest.fn();
    const httpService = {
      post,
      get,
      delete: deleteRequest,
    } as unknown as HttpService;

    return {
      service: new OpenAIService(configService, httpService),
      post,
      get,
      deleteRequest,
    };
  };

  it('calls RAG chat endpoint with the configured internal URL', async () => {
    const { service, post } = createService();
    post.mockReturnValue(
      of({
        data: {
          game_title: 'Rummikub',
          answer_type: 'rule',
          description: 'answer',
          source: 'rulebook',
          page: '1',
          session_id: 'session-1',
        },
      }),
    );

    await expect(
      service.chat({
        message: '질문',
        gameKey: 'rummikub',
        sessionId: 'session-1',
      }),
    ).resolves.toMatchObject({
      message: 'answer',
      sessionId: 'session-1',
    });

    expect(post).toHaveBeenCalledWith(`${ragServerUrl}/api/v1/chat`, {
      question: '질문',
      game_key: 'rummikub',
      session_id: 'session-1',
    });
  });

  it('calls RAG health endpoint with the configured internal URL', async () => {
    const { service, get } = createService();
    get.mockReturnValue(
      of({
        data: {
          status: 'healthy',
          available_games: ['rummikub'],
        },
      }),
    );

    await expect(service.healthCheck()).resolves.toEqual({
      status: 'healthy',
      available_games: ['rummikub'],
    });
    expect(get).toHaveBeenCalledWith(`${ragServerUrl}/api/v1/health`);
  });
});

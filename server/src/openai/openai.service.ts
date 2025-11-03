import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ChatInput, FileSearchInput } from './dto/openai.input';
import { ChatResponse, FileSearchResponse } from './dto/openai.response';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly ragServerUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.ragServerUrl = this.configService.get<string>('RAG_SERVER_URL');
  }

  async chat(input: ChatInput): Promise<ChatResponse> {
    try {
      this.logger.log(`Processing chat request: ${input.message}`);

      const requestBody = {
        question: input.message,
        game_key: input.gameKey || 'sabotage',
        session_id: input.sessionId || 'default',
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.ragServerUrl}/api/v1/chat`, requestBody),
      );

      const data = response.data as {
        game_title: string;
        answer_type: string;
        description: string;
        source: string;
        page: string;
        session_id: string;
      };

      return {
        message: data.description,
        sessionId: data.session_id,
        timestamp: new Date().toISOString(),
        gameTitle: data.game_title,
        answerType: data.answer_type,
        source: data.source,
        page: data.page,
      };
    } catch (error) {
      this.logger.error('Error in chat completion:', error);
      throw new Error('Failed to process chat request');
    }
  }

  async healthCheck(): Promise<{ status: string; available_games: string[] }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.ragServerUrl}/api/v1/health`),
      );

      return response.data as {
        status: string;
        available_games: string[];
      };
    } catch (error) {
      this.logger.error('Error in health check:', error);
      throw new Error('Failed to check RAG server health');
    }
  }

  async deleteSession(sessionId: string): Promise<{ message: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `${this.ragServerUrl}/api/v1/session/${sessionId}`,
        ),
      );

      return response.data as { message: string };
    } catch (error) {
      this.logger.error('Error deleting session:', error);
      throw new Error('Failed to delete session');
    }
  }
}

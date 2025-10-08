import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatInput, FileSearchInput } from './dto/openai.input';
import { ChatResponse, FileSearchResponse } from './dto/openai.response';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async chat(input: ChatInput): Promise<ChatResponse> {
    try {
      this.logger.log(`Processing chat request: ${input.message}`);

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `당신은 보드게임 전문가 어시스턴트입니다. 
          보드게임 규칙, 전략, 추천에 대해 친근하고 도움이 되는 답변을 제공해주세요.
          답변은 한국어로 해주시고, 1줄로 간결하게 답변하세요.`,
        },
        {
          role: 'user',
          content: input.message,
        },
      ];

      // 컨텍스트가 있다면 추가
      if (input.context && input.context.length > 0) {
        messages.splice(1, 0, {
          role: 'system',
          content: `다음은 이전 대화의 컨텍스트입니다: ${input.context.join(' ')}`,
        });
      }

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 2048,
        temperature: 0.7,
      });

      const responseMessage = completion.choices[0]?.message?.content || '';

      return {
        message: responseMessage,
        sessionId: input.sessionId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error in chat completion:', error);
      throw new Error('Failed to process chat request');
    }
  }

  async searchWithFiles(input: FileSearchInput): Promise<FileSearchResponse> {
    try {
      this.logger.log(`Processing file search request: ${input.query}`);

      // 파일 검색 기능 구현
      // 현재는 기본 프롬프트를 사용하지만, 실제로는 vector store를 활용
      const prompt =
        input.promptId && input.promptVersion
          ? {
              id: input.promptId,
              version: input.promptVersion,
            }
          : undefined;

      const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];

      // OpenAI의 file_search 도구는 beta 기능이므로 일단 주석 처리
      // if (input.vectorStoreIds && input.vectorStoreIds.length > 0) {
      //   tools.push({
      //     type: 'file_search' as any,
      //     file_search: {
      //       vector_store_ids: input.vectorStoreIds,
      //     },
      //   });
      // }

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `당신은 보드게임 규칙서와 매뉴얼을 전문적으로 검색하고 설명하는 어시스턴트입니다.
          제공된 문서에서 정확한 정보를 찾아 상세하고 명확한 답변을 제공해주세요.
          규칙이나 절차에 대한 질문에는 단계별로 설명해주세요.`,
        },
        {
          role: 'user',
          content: input.query,
        },
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: tools.length > 0 ? tools : undefined,
        max_tokens: 2048,
        temperature: 0.3, // 더 정확한 답변을 위해 낮은 온도
      });

      const responseMessage = completion.choices[0]?.message?.content || '';

      // 소스 정보 추출 (실제 구현에서는 tool_calls에서 추출)
      const sources: string[] = [];
      if (completion.choices[0]?.message?.tool_calls) {
        // 파일 검색 결과에서 소스 추출
        // 실제 구현에서는 OpenAI API 응답에서 소스 정보를 파싱
      }

      return {
        answer: responseMessage,
        query: input.query,
        sources,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error in file search:', error);
      throw new Error('Failed to process file search request');
    }
  }

  async createVectorStore(name: string, fileIds: string[]): Promise<string> {
    try {
      this.logger.log(`Creating vector store: ${name}`);

      // OpenAI의 vector store 기능은 beta 기능이므로 일단 mock 구현
      // const vectorStore = await this.openai.beta.vectorStores.create({
      //   name,
      //   file_ids: fileIds,
      // });

      // 임시로 랜덤 ID 반환
      const mockVectorStoreId = `vs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.logger.log(`Vector store created with ID: ${mockVectorStoreId}`);
      return mockVectorStoreId;
    } catch (error) {
      this.logger.error('Error creating vector store:', error);
      throw new Error('Failed to create vector store');
    }
  }

  async uploadFile(
    filePath: string,
    purpose: 'assistants' = 'assistants',
  ): Promise<string> {
    try {
      this.logger.log(`Uploading file: ${filePath}`);

      const file = await this.openai.files.create({
        file: require('fs').createReadStream(filePath),
        purpose,
      });

      this.logger.log(`File uploaded with ID: ${file.id}`);
      return file.id;
    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }
}

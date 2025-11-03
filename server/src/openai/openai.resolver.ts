import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { ChatInput, FileSearchInput } from './dto/openai.input';
import { ChatResponse, FileSearchResponse } from './dto/openai.response';
import { ChatSession, ChatMessage } from './entities/chat.entity';

@Resolver()
export class OpenAIResolver {
  private readonly logger = new Logger(OpenAIResolver.name);
  private readonly chatSessions = new Map<string, ChatSession>(); // 임시 저장소

  constructor(private readonly openaiService: OpenAIService) {}

  @Mutation(() => ChatResponse)
  async chat(@Args('input') input: ChatInput): Promise<ChatResponse> {
    try {
      this.logger.log(`Chat request for session: ${input.sessionId}`);

      const response = await this.openaiService.chat(input);

      // Store message in session
      this.updateChatSession(input.sessionId, input.message, response.message);

      return response;
    } catch (error) {
      this.logger.error('Error in chat mutation:', error);
      throw error;
    }
  }

  @Query(() => ChatSession, { nullable: true })
  async getChatSession(
    @Args('sessionId') sessionId: string,
  ): Promise<ChatSession | null> {
    return this.chatSessions.get(sessionId) || null;
  }

  @Query(() => [ChatSession])
  async getAllChatSessions(): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values());
  }

  @Mutation(() => ChatSession)
  async createChatSession(
    @Args('sessionId') sessionId: string,
  ): Promise<ChatSession> {
    const session: ChatSession = {
      id: sessionId,
      sessionId: sessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    this.chatSessions.set(sessionId, session);
    this.logger.log(`Created new chat session: ${sessionId}`);

    return session;
  }

  @Mutation(() => Boolean)
  async deleteChatSession(
    @Args('sessionId') sessionId: string,
  ): Promise<boolean> {
    try {
      // Delete from RAG server
      await this.openaiService.deleteSession(sessionId);

      // Delete from local cache
      const deleted = this.chatSessions.delete(sessionId);
      if (deleted) {
        this.logger.log(`Deleted chat session: ${sessionId}`);
      }
      return deleted;
    } catch (error) {
      this.logger.error('Error deleting session:', error);
      return false;
    }
  }

  private updateChatSession(
    sessionId: string,
    userMessage: string,
    assistantMessage: string,
  ): void {
    let session = this.chatSessions.get(sessionId);

    if (!session) {
      session = {
        id: sessionId,
        sessionId: sessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
    }

    // 사용자 메시지 추가
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    // 어시스턴트 메시지 추가
    const assistantMsg: ChatMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      content: assistantMessage,
      timestamp: new Date().toISOString(),
    };

    session.messages.push(userMsg, assistantMsg);
    session.updatedAt = new Date().toISOString();

    this.chatSessions.set(sessionId, session);
  }
}

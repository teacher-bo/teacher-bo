import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class ChatSession {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  sessionId: string;

  @Field(() => [ChatMessage])
  messages: ChatMessage[];

  @Field(() => String)
  createdAt: string;

  @Field(() => String)
  updatedAt: string;
}

@ObjectType()
export class ChatMessage {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  content: string;

  @Field(() => String)
  role: string; // 'user' | 'assistant' | 'system'

  @Field(() => String)
  timestamp: string;

  @Field(() => [String], { nullable: true })
  sources?: string[];

  @Field(() => String, { nullable: true })
  reasoning?: string;
}

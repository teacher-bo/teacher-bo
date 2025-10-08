import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class ChatResponse {
  @Field(() => String)
  message: string;

  @Field(() => String, { nullable: true })
  sessionId?: string;

  @Field(() => [String], { nullable: true })
  sources?: string[];

  @Field(() => String)
  timestamp: string;

  @Field(() => String, { nullable: true })
  reasoning?: string;
}

@ObjectType()
export class FileSearchResponse {
  @Field(() => String)
  answer: string;

  @Field(() => [String], { nullable: true })
  sources?: string[];

  @Field(() => String)
  query: string;

  @Field(() => String)
  timestamp: string;

  @Field(() => String, { nullable: true })
  reasoning?: string;
}

@ObjectType()
export class SearchSource {
  @Field(() => String)
  title: string;

  @Field(() => String)
  url: string;

  @Field(() => String, { nullable: true })
  snippet?: string;
}

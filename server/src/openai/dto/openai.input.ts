import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

@InputType()
export class ChatInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  message: string;

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  context?: string[];

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  sessionId?: string;
}

@InputType()
export class FileSearchInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  query: string;

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  vectorStoreIds?: string[];

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  promptId?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  promptVersion?: string;
}

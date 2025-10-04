import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

@InputType()
export class CreateGameInput {
  @Field()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  minPlayers: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  maxPlayers: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  playTime?: number;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  complexity?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  bggId?: number;
}

@InputType()
export class UpdateGameInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  minPlayers?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPlayers?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  playTime?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  complexity?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  bggId?: number;
}

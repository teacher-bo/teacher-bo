import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';

@InputType()
export class CreateSessionInput {
  @Field()
  @IsString()
  gameId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  playerCount: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}

@InputType()
export class UpdateSessionInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  status?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Field({ nullable: true })
  @IsOptional()
  endedAt?: Date;
}

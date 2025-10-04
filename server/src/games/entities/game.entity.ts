import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

@ObjectType()
export class Game {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Int)
  minPlayers: number;

  @Field(() => Int)
  maxPlayers: number;

  @Field(() => Int, { nullable: true })
  playTime?: number;

  @Field(() => Int, { nullable: true })
  complexity?: number;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field(() => Int, { nullable: true })
  bggId?: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => User)
  createdBy: User;

  @Field()
  createdById: string;
}

@ObjectType()
export class GameRule {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  content: string;

  @Field(() => Int)
  order: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => Game)
  game: Game;

  @Field()
  gameId: string;
}

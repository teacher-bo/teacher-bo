import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { Game } from '../../games/entities/game.entity';
import { User } from '../../users/entities/user.entity';

export enum GameSessionStatus {
  PLAYING = 'PLAYING',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
}

registerEnumType(GameSessionStatus, {
  name: 'GameSessionStatus',
});

@ObjectType()
export class GameSession {
  @Field(() => ID)
  id: string;

  @Field()
  startedAt: Date;

  @Field({ nullable: true })
  endedAt?: Date;

  @Field(() => GameSessionStatus)
  status: GameSessionStatus;

  @Field(() => Int)
  playerCount: number;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => Game)
  game: Game;

  @Field()
  gameId: string;

  @Field(() => User)
  host: User;

  @Field()
  hostId: string;
}

@ObjectType()
export class SessionPlayer {
  @Field(() => ID)
  id: string;

  @Field()
  nickname: string;

  @Field({ nullable: true })
  color?: string;

  @Field(() => Int)
  order: number;

  @Field(() => GameSession)
  session: GameSession;

  @Field()
  sessionId: string;
}

@ObjectType()
export class PlayerScore {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  score: number;

  @Field(() => Int)
  round: number;

  @Field(() => GameSession)
  session: GameSession;

  @Field()
  sessionId: string;

  @Field(() => SessionPlayer)
  player: SessionPlayer;

  @Field()
  playerId: string;
}

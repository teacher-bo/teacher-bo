import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { GamesService } from './games.service';
import { Game } from './entities/game.entity';
import { CreateGameInput, UpdateGameInput } from './dto/game.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Resolver(() => Game)
export class GamesResolver {
  constructor(private readonly gamesService: GamesService) {}

  @Query(() => [Game], { name: 'games' })
  findAll() {
    return this.gamesService.findAll();
  }

  @Query(() => Game, { name: 'game' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.gamesService.findOne(id);
  }

  @Mutation(() => Game)
  @UseGuards(JwtAuthGuard)
  createGame(
    @Args('createGameInput') createGameInput: CreateGameInput,
    @CurrentUser() user: User,
  ) {
    return this.gamesService.create(createGameInput, user.id);
  }

  @Mutation(() => Game)
  @UseGuards(JwtAuthGuard)
  updateGame(
    @Args('id', { type: () => ID }) id: string,
    @Args('updateGameInput') updateGameInput: UpdateGameInput,
  ) {
    return this.gamesService.update(id, updateGameInput);
  }

  @Mutation(() => Game)
  @UseGuards(JwtAuthGuard)
  removeGame(@Args('id', { type: () => ID }) id: string) {
    return this.gamesService.remove(id);
  }
}

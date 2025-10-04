import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { SessionsService } from './sessions.service';
import { GameSession } from './entities/session.entity';
import { CreateSessionInput, UpdateSessionInput } from './dto/session.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Resolver(() => GameSession)
export class SessionsResolver {
  constructor(private readonly sessionsService: SessionsService) {}

  @Query(() => [GameSession], { name: 'sessions' })
  findAll() {
    return this.sessionsService.findAll();
  }

  @Query(() => GameSession, { name: 'session' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.sessionsService.findOne(id);
  }

  @Mutation(() => GameSession)
  @UseGuards(JwtAuthGuard)
  createSession(
    @Args('createSessionInput') createSessionInput: CreateSessionInput,
    @CurrentUser() user: User,
  ) {
    return this.sessionsService.create(createSessionInput, user.id);
  }

  @Mutation(() => GameSession)
  @UseGuards(JwtAuthGuard)
  updateSession(
    @Args('id', { type: () => ID }) id: string,
    @Args('updateSessionInput') updateSessionInput: UpdateSessionInput,
  ) {
    return this.sessionsService.update(id, updateSessionInput);
  }

  @Mutation(() => GameSession)
  @UseGuards(JwtAuthGuard)
  removeSession(@Args('id', { type: () => ID }) id: string) {
    return this.sessionsService.remove(id);
  }
}

import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthResponse } from './entities/auth.entity';
import { LoginInput, RegisterInput } from './dto/auth.input';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthResponse)
  async login(@Args('loginInput') loginInput: LoginInput) {
    const user = await this.authService.validateUser(
      loginInput.email,
      loginInput.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authService.login(user);
  }

  @Mutation(() => AuthResponse)
  async register(@Args('registerInput') registerInput: RegisterInput) {
    return this.authService.register(
      registerInput.email,
      registerInput.username,
      registerInput.password,
      registerInput.name,
    );
  }
}

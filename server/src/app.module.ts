import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from './prisma/prisma.module';
import { TranscribeModule } from './transcribe/transcribe.module';
import { OpenAIModule } from './openai/openai.module';
import { PollyModule } from './polly/polly.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env', '../.env'],
      isGlobal: true, // ConfigModule을 전역으로 설정
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: process.env.NODE_ENV === 'development',
      sortSchema: true,
      path: '/api/graphql',
      subscriptions: {
        'graphql-ws': {
          path: '/api/graphql',
        },
      },
      installSubscriptionHandlers: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    // PrismaModule,
    TranscribeModule,
    OpenAIModule,
    PollyModule,
  ],
})
export class AppModule {}

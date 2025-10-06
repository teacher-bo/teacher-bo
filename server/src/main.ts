import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { config } from 'dotenv';
import { json } from 'body-parser';
import helmet from 'helmet';

import * as dayjs from 'dayjs';
import 'dayjs/locale/ko';
import * as relativeTime from 'dayjs/plugin/relativeTime';

import { AppModule } from './app.module';

config({ path: '.env' });

dayjs.locale('ko');
dayjs.extend(relativeTime);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 보안 헤더 설정 (helmet)
  // app.use(
  //   helmet({
  //     contentSecurityPolicy: {
  //       directives: {
  //         defaultSrc: ["'self'"],
  //         scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  //         styleSrc: ["'self'", "'unsafe-inline'"],
  //         imgSrc: ["'self'", 'data:', 'https:'],
  //         connectSrc: ["'self'", 'wss:', 'ws:'],
  //       },
  //     },
  //     crossOriginEmbedderPolicy: false, // GraphQL Playground를 위해 비활성화
  //   }),
  // );

  // app.enableCors({
  //   origin: [process.env.CLIENT_URL],
  //   credentials: true,
  //   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: [
  //     'Content-Type',
  //     'Authorization',
  //     'x-device-fingerprint',
  //     'x-client-version',
  //     'x-platform',
  //     'Apollo-Require-Preflight',
  //   ],
  //   exposedHeaders: ['x-version-mismatch', 'x-server-version'],
  // });

  // Resolve '413 Request Entity Too Large' on file upload
  app.use(json({ limit: '50mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT || 1002;
  await app.listen(port);

  console.log(
    `🚀 Board Game Assistant server is running on: http://localhost:${port}/graphql`,
  );
}

bootstrap();

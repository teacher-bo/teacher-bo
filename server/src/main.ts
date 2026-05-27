import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { config } from 'dotenv';
import { json } from 'body-parser';

import * as dayjs from 'dayjs';
import 'dayjs/locale/ko';
import * as relativeTime from 'dayjs/plugin/relativeTime';

import { AppModule } from './app.module';

config({ path: '.env' });

dayjs.locale('ko');
dayjs.extend(relativeTime);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const clientOrigins = (process.env.CLIENT_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  app.enableCors({
    origin: clientOrigins.length > 0 ? clientOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-device-fingerprint',
      'x-client-version',
      'x-platform',
      'Apollo-Require-Preflight',
    ],
    exposedHeaders: ['x-version-mismatch', 'x-server-version'],
  });

  app.use(json({ limit: '50mb' }));

  app
    .getHttpAdapter()
    .getInstance()
    .get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'Board Game Assistant',
        version: '1.0.0',
      });
    });

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

/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const globalPrefix = 'api';
  const uploadRoot = join(
    process.cwd(),
    process.env.UPLOAD_DIR || 'uploads',
  );
  mkdirSync(uploadRoot, { recursive: true });
  app.useStaticAssets(uploadRoot, { prefix: '/api/uploads/' });
  app.setGlobalPrefix(globalPrefix);
  const port = Number(process.env.API_PORT || process.env.PORT || 3000);
  await app.listen(port);
  Logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();

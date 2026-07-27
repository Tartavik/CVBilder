import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, NextFunction, Request, Response, urlencoded } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));
  const globalPrefix = 'api';
  const uploadRoot = join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  mkdirSync(uploadRoot, { recursive: true });
  app.useStaticAssets(uploadRoot, { prefix: '/api/uploads/' });
  app.setGlobalPrefix(globalPrefix);

  const browserRoot = join(__dirname, '../web/browser');
  const indexPath = join(browserRoot, 'index.html');

  if (existsSync(indexPath)) {
    app.useStaticAssets(browserRoot);
    app.use((request: Request, response: Response, next: NextFunction) => {
      const isApiRequest =
        request.path === `/${globalPrefix}` ||
        request.path.startsWith(`/${globalPrefix}/`);

      if (request.method === 'GET' && !isApiRequest) {
        response.sendFile(indexPath);
        return;
      }

      next();
    });
  }

  const port = Number(process.env.API_PORT || process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
  Logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();

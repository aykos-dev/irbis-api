import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { buildOpenApiDocument, configureApp } from './app.setup.js';
import { AppConfig } from './config/app-config.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  configureApp(app);

  const config = app.get(AppConfig);
  if (config.nodeEnv !== 'production') {
    SwaggerModule.setup('docs', app, buildOpenApiDocument(app));
  }
  await app.listen(config.port);
}

await bootstrap();

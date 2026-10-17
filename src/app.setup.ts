import { VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppConfig } from './config/app-config.js';
import { packageVersion } from './config/package-version.js';

/**
 * Everything main.ts applies to the app, shared with e2e tests and the OpenAPI export so
 * they exercise the same pipeline: logger, helmet, CORS allowlist, body limit, /v1 versioning.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(AppConfig);

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  app.useBodyParser('json', { limit: config.bodyLimit });
  app.useBodyParser('urlencoded', { limit: config.bodyLimit, extended: false });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();
}

export function buildOpenApiDocument(
  app: NestExpressApplication,
): OpenAPIObject {
  const document = new DocumentBuilder()
    .setTitle('Irbis API')
    .setDescription(
      'Backend for the Irbis app and admin web. This document is the contract (ADR-003).',
    )
    .setVersion(packageVersion)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  return SwaggerModule.createDocument(app, document);
}

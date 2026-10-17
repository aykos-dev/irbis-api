/**
 * Writes openapi.json (the contract) at the repo root without listening on a port and
 * without a database: config gets fixed, inert values (so the output never depends on a
 * local env file), and PrismaService connects lazily, so nothing ever dials Postgres.
 *
 *   npm run openapi:export
 */
import { writeFileSync } from 'node:fs';
import type { NestExpressApplication } from '@nestjs/platform-express';

const EXPORT_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  CORS_ORIGINS: 'http://localhost',
  JWT_ACCESS_SECRET: 'openapi-export-only-placeholder-not-used-to-sign',
  DATABASE_URL: 'postgresql://openapi-export@127.0.0.1:1/unused',
};
Object.assign(process.env, EXPORT_ENV);

const { NestFactory } = await import('@nestjs/core');
const { AppModule } = await import('../src/app.module.js');
const { buildOpenApiDocument, configureApp } =
  await import('../src/app.setup.js');

const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  logger: false,
  bodyParser: false,
  abortOnError: false,
});
configureApp(app);
await app.init();

const document = buildOpenApiDocument(app);
writeFileSync(
  new URL('../../openapi.json', import.meta.url),
  `${JSON.stringify(document, null, 2)}\n`,
);
await app.close();

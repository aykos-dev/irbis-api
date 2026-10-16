import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';

/**
 * Boots the real AppModule with the same pipeline as main.ts. The env must be set before
 * AppModule is imported, because ConfigModule.forRoot validates it at import time.
 */
export async function createE2eApp(
  env: Record<string, string>,
): Promise<NestExpressApplication> {
  Object.assign(process.env, env);
  const { AppModule } = await import('../../src/app.module.js');
  const { configureApp } = await import('../../src/app.setup.js');

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
  });
  configureApp(app);
  await app.init();
  return app;
}

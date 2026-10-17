import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { createE2eApp } from './setup/app.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

describe('rate limits on auth routes (e2e)', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(
      e2eEnv(db.getConnectionUri(), {
        AUTH_THROTTLE_LIMIT: '3',
        LOOKUP_THROTTLE_LIMIT: '4',
        AUTH_THROTTLE_TTL_MS: '60000',
      }),
    );
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('429 RATE_LIMITED with retryAfterSec on the 4th log-in attempt in a window', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/v1/auth/log-in')
        .send({ username: 'someone', password: 'whatever-1' });
    for (let i = 0; i < 3; i++) await attempt().expect(401);
    const res = await attempt().expect(429);
    expect(res.body).toMatchObject({ code: 'RATE_LIMITED', statusCode: 429 });
    expect(res.body.retryAfterSec).toBeGreaterThan(0);
    expect(res.body.retryAfterSec).toBeLessThanOrEqual(60);
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('forgot-password is limited too, with the same answer shape', async () => {
    const forgot = () =>
      request(app.getHttpServer())
        .post('/v1/auth/password/forgot')
        .send({ username: 'someone' });
    // the previous test already used this IP's "auth" budget for other routes; this route has its own counter
    for (let i = 0; i < 3; i++) await forgot().expect(202);
    expect((await forgot().expect(429)).body.code).toBe('RATE_LIMITED');
  });

  it('username-available has its own limit', async () => {
    const check = () =>
      request(app.getHttpServer())
        .get('/v1/auth/username-available')
        .query({ u: 'abc' });
    for (let i = 0; i < 4; i++) await check().expect(200);
    const res = await check().expect(429);
    expect(res.body.code).toBe('RATE_LIMITED');
  });

  it('routes without a stricter tier are not affected', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });
});

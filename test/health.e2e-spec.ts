import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { createE2eApp } from './setup/app.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

describe('GET /health (e2e)', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('AC1: 200 { status: ok, db: up, version, time } when Postgres is reachable', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body).toEqual({
      status: 'ok',
      db: 'up',
      version: expect.stringMatching(/^\d+\.\d+\.\d+/),
      time: expect.any(String),
    });
    expect(new Date(res.body.time).toISOString()).toBe(res.body.time);
    expect(res.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('is public and unversioned (no /v1 prefix, no token needed)', async () => {
    await request(app.getHttpServer()).get('/v1/health').expect(404);
  });

  it('AC2: 503 { status: degraded, db: down, … } within 3 s when Postgres is stopped', async () => {
    await db.stop();

    const started = Date.now();
    const res = await request(app.getHttpServer()).get('/health').expect(503);
    const elapsedMs = Date.now() - started;

    expect(res.body).toEqual({
      status: 'degraded',
      db: 'down',
      version: expect.stringMatching(/^\d+\.\d+\.\d+/),
      time: expect.any(String),
    });
    expect(elapsedMs).toBeLessThan(3_000);
  });
});

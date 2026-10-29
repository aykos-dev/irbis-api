import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { GOOD_PASSWORD, bearer, signUp, uniqueName } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

describe('demo accounts (e2e) - ADR-006, check-in AC6/AC8', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  const server = () => app.getHttpServer();
  const createDemo = () =>
    request(server()).post('/v1/auth/demo').send({ locale: 'en' });
  const logIn = (username: string, password: string) =>
    request(server()).post('/v1/auth/log-in').send({ username, password });
  const secure = (token: string, body: Record<string, unknown>) =>
    request(server())
      .post('/v1/me/secure')
      .set(...bearer(token))
      .send(body);

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  // All requests share one client IP: this suite owns all 5 demo slots of the day, in order.
  it('demo 201 → isDemo → guest-merge → log-in 401 → secure 200 → log-in 200', async () => {
    const demo = await createDemo().expect(201);
    expect(demo.body.me).toMatchObject({ isDemo: true, locale: 'en' });
    expect(demo.body.me.username).toMatch(/^explorer_\d{4}$/);
    const token: string = demo.body.accessToken;
    const terms = () =>
      app
        .get(PrismaService)
        .user.findUniqueOrThrow({ where: { id: demo.body.me.id } })
        .then((row) => row.termsAcceptedAt);
    expect(await terms()).toBeNull();
    expect(demo.body.refreshToken).toEqual(expect.any(String));

    const me = await request(server())
      .get('/v1/me')
      .set(...bearer(token))
      .expect(200);
    expect(me.body.isDemo).toBe(true);

    const merged = await request(server())
      .post('/v1/me/guest-merge')
      .set(...bearer(token))
      .send({ onboarding: { experience: 'weekend', interests: ['peaks'] } })
      .expect(200);
    expect(merged.body.merged).toEqual(['onboarding']);

    const beforeSecure = await logIn(
      demo.body.me.username,
      GOOD_PASSWORD,
    ).expect(401);
    expect(beforeSecure.body.code).toBe('INVALID_CREDENTIALS');

    const username = uniqueName('secured');
    const secured = await secure(token, {
      username,
      password: GOOD_PASSWORD,
      acceptTerms: true,
    }).expect(200);
    expect(secured.body).toMatchObject({ username, isDemo: false });
    expect(await terms()).toEqual(expect.any(Date));

    // The session is kept.
    await request(server())
      .get('/v1/me')
      .set(...bearer(token))
      .expect(200);
    await logIn(username, GOOD_PASSWORD).expect(200);
  });

  it('400 TERMS_REQUIRED when securing without accepting the terms', async () => {
    const demo = await createDemo().expect(201);
    const body = { username: uniqueName(), password: GOOD_PASSWORD };
    const refused = await secure(demo.body.accessToken, {
      ...body,
      acceptTerms: false,
    }).expect(400);
    expect(refused.body.code).toBe('TERMS_REQUIRED');
    const missing = await secure(demo.body.accessToken, body).expect(400);
    expect(missing.body.code).toBe('VALIDATION_FAILED');
  });

  it('409 NOT_DEMO when securing a normal account', async () => {
    const account = await signUp(app);
    const res = await secure(account.accessToken, {
      username: uniqueName(),
      password: GOOD_PASSWORD,
      acceptTerms: true,
    }).expect(409);
    expect(res.body.code).toBe('NOT_DEMO');
  });

  it('409 USERNAME_TAKEN when securing with a taken username', async () => {
    const other = await signUp(app);
    const demo = await createDemo().expect(201);
    const res = await secure(demo.body.accessToken, {
      username: other.username,
      password: GOOD_PASSWORD,
      acceptTerms: true,
    }).expect(409);
    expect(res.body.code).toBe('USERNAME_TAKEN');
  });

  it('429 DEMO_LIMIT for the 6th demo account from one IP in 24 h', async () => {
    // Three created above; two more fill the day's limit of 5.
    for (let i = 0; i < 2; i += 1) await createDemo().expect(201);
    const res = await createDemo().expect(429);
    expect(res.body.code).toBe('DEMO_LIMIT');
  });
});

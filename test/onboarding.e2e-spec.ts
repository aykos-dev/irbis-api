import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { createE2eApp } from './setup/app.js';
import { type Account, bearer, resetAttempts, signUp } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

describe('onboarding guest merge (e2e) - AC7, AC8', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;

  const server = () => app.getHttpServer();
  const merge = (account: Account, body: Record<string, unknown>) =>
    request(server())
      .post('/v1/me/guest-merge')
      .set(...bearer(account.accessToken))
      .send(body);
  const me = async (account: Account): Promise<Record<string, unknown>> => {
    const res = await request(server())
      .get('/v1/me')
      .set(...bearer(account.accessToken))
      .expect(200);
    return res.body as Record<string, unknown>;
  };

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  beforeEach(async () => {
    await resetAttempts(app);
  });

  it('AC7: a new account starts empty and gets the guest onboarding choices', async () => {
    const account = await signUp(app);
    expect(await me(account)).toMatchObject({
      experience: null,
      interests: [],
    });
    const res = await merge(account, {
      onboarding: { experience: 'weekend', interests: ['peaks', 'lakes'] },
    }).expect(200);
    expect(res.body).toEqual({ merged: ['onboarding'], skipped: [] });
    expect(await me(account)).toMatchObject({
      experience: 'weekend',
      interests: ['peaks', 'lakes'],
    });
  });

  it('AC7: 400 VALIDATION_FAILED for an unknown enum, duplicate or too many interests, or an unknown key', async () => {
    const account = await signUp(app);
    for (const onboarding of [
      { experience: 'pro' },
      { interests: ['peaks', 'peaks'] },
      { interests: ['peaks', 'caves', 'lakes', 'camping', 'trails', 'peaks'] },
      { xp: 100 },
    ]) {
      const res = await merge(account, { onboarding }).expect(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
    }
    expect(await me(account)).toMatchObject({
      experience: null,
      interests: [],
    });
  });

  it('AC8: existing account values win; an empty incoming list changes nothing', async () => {
    const account = await signUp(app);
    await merge(account, {
      onboarding: { experience: 'beginner', interests: ['caves'] },
    }).expect(200);
    const res = await merge(account, {
      onboarding: { experience: 'experienced', interests: ['peaks', 'trails'] },
    }).expect(200);
    expect(res.body).toEqual({ merged: ['onboarding'], skipped: [] });
    await merge(account, { onboarding: { interests: [] } }).expect(200);
    expect(await me(account)).toMatchObject({
      experience: 'beginner',
      interests: ['caves'],
    });
  });

  it('AC8: the guest locale never overwrites the account locale', async () => {
    const account = await signUp(app, { locale: 'en' });
    const res = await merge(account, { locale: 'ru' }).expect(200);
    expect(res.body.skipped).toContain('locale');
    expect((await me(account)).locale).toBe('en');
  });
});

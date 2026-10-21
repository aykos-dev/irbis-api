import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { createE2eApp } from './setup/app.js';
import { type Account, bearer, signUp, uniqueName } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

describe('profile settings (e2e) - AC2, AC6', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;

  const server = () => app.getHttpServer();
  const me = (accessToken: string) =>
    request(server()).get('/v1/me').set(...bearer(accessToken));
  const patch = (account: Account, body: Record<string, unknown>) =>
    request(server())
      .patch('/v1/me')
      .set(...bearer(account.accessToken))
      .send(body);
  const logIn = (username: string, password: string) =>
    request(server()).post('/v1/auth/log-in').send({ username, password });
  const refresh = (refreshToken: string) =>
    request(server()).post('/v1/auth/refresh').send({ refreshToken });
  const sidOf = (accessToken: string): unknown =>
    (
      JSON.parse(
        Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString(),
      ) as { sid?: unknown }
    ).sid;

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('username change keeps the caller session, ends the other one and switches log-in', async () => {
    const first = await signUp(app);
    const second = await logIn(first.username, first.password).expect(200);
    const renamed = uniqueName('renamed');

    const updated = await patch(first, {
      username: renamed.toUpperCase(),
      currentPassword: first.password,
    }).expect(200);
    expect(updated.body.username).toBe(renamed);
    expect(sidOf(first.accessToken)).toEqual(expect.any(String));

    const refreshed = await refresh(first.refreshToken).expect(200);
    expect(sidOf(refreshed.body.accessToken)).toEqual(expect.any(String));
    const current = await me(refreshed.body.accessToken).expect(200);
    expect(current.body.username).toBe(renamed);

    const revoked = await refresh(second.body.refreshToken).expect(401);
    expect(revoked.body.code).toBe('REFRESH_INVALID');

    await logIn(renamed, first.password).expect(200);
    const oldName = await logIn(first.username, first.password).expect(401);
    expect(oldName.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('username change: missing password 400, wrong 401, taken 409, same name no-op', async () => {
    const account = await signUp(app);
    const other = await signUp(app);

    const missing = await patch(account, {
      username: uniqueName('next'),
    }).expect(400);
    expect(missing.body.fieldErrors).toEqual({ currentPassword: ['required'] });

    const wrong = await patch(account, {
      username: uniqueName('next'),
      currentPassword: 'not-the-password',
    }).expect(401);
    expect(wrong.body.code).toBe('INVALID_PASSWORD');

    const taken = await patch(account, {
      username: other.username,
      currentPassword: account.password,
    }).expect(409);
    expect(taken.body.code).toBe('USERNAME_TAKEN');

    const same = await patch(account, {
      username: account.username.toUpperCase(),
    }).expect(200);
    expect(same.body.username).toBe(account.username);
  });

  it('PATCH /v1/me persists partial preferences and GET /v1/me reflects them', async () => {
    const account = await signUp(app);
    const res = await patch(account, {
      preferences: {
        showHomeRegion: true,
        units: 'imperial',
        appearance: 'dark',
        notifications: { streakReminders: false, dailyGameTime: '21:00' },
        privacy: { publicProfile: false, findBuddies: false },
      },
    }).expect(200);
    expect(res.body.preferences).toMatchObject({
      showStats: true,
      showHomeRegion: true,
      units: 'imperial',
      appearance: 'dark',
      notifications: {
        tripSafety: true,
        streakReminders: false,
        dailyGame: true,
        dailyGameTime: '21:00',
        groupsMessages: true,
        social: true,
        offers: false,
      },
      privacy: {
        publicProfile: false,
        findBuddies: false,
        shareLocation: 'trips',
      },
    });
    expect((await me(account.accessToken).expect(200)).body.preferences).toEqual(
      res.body.preferences,
    );

    const invalid = await patch(account, {
      preferences: {
        units: 'miles',
        notifications: { dailyGameTime: '24:00' },
      },
    }).expect(400);
    expect(invalid.body.code).toBe('VALIDATION_FAILED');

    const readOnly = await patch(account, {
      preferences: { notifications: { tripSafety: false } },
    }).expect(400);
    expect(readOnly.body.code).toBe('VALIDATION_FAILED');

    const kept = await me(account.accessToken).expect(200);
    expect(kept.body.preferences.units).toBe('imperial');
    expect(kept.body.preferences.notifications.tripSafety).toBe(true);
    expect(kept.body.preferences.privacy.shareLocation).toBe('trips');
  });
});

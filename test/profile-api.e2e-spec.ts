import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { type Account, bearer, signUp } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

describe('profile API (e2e) - AC1', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;

  const server = () => app.getHttpServer();
  const me = (account: Account) =>
    request(server())
      .get('/v1/me')
      .set(...bearer(account.accessToken));
  const patch = (account: Account, body: Record<string, unknown>) =>
    request(server())
      .patch('/v1/me')
      .set(...bearer(account.accessToken))
      .send(body);
  const profile = (username: string) =>
    request(server()).get(`/v1/users/${username}`);

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('GET /v1/me returns the profile fields and default preferences', async () => {
    const account = await signUp(app);
    const res = await me(account).expect(200);
    expect(res.body).toMatchObject({
      displayName: null,
      bio: null,
      avatarUrl: null,
      homeRegion: null,
      preferences: {
        showStats: true,
        showHomeRegion: false,
        units: 'metric',
        appearance: 'auto',
        notifications: {
          tripSafety: true,
          streakReminders: true,
          dailyGame: true,
          dailyGameTime: '19:00',
          groupsMessages: true,
          social: true,
          offers: false,
        },
        privacy: {
          publicProfile: true,
          findBuddies: true,
          shareLocation: 'trips',
        },
      },
    });
  });

  it('PATCH /v1/me trims and updates name, bio, region, interests and locale; empty clears', async () => {
    const account = await signUp(app);
    const updated = await patch(account, {
      displayName: '  Sardor  ',
      bio: '  Explorer  ',
      homeRegion: 'samarkand',
      interests: ['peaks', 'lakes'],
      locale: 'ru',
    }).expect(200);
    expect(updated.body).toMatchObject({
      displayName: 'Sardor',
      bio: 'Explorer',
      homeRegion: 'samarkand',
      interests: ['peaks', 'lakes'],
      locale: 'ru',
    });
    expect((await me(account).expect(200)).body).toMatchObject({
      displayName: 'Sardor',
      bio: 'Explorer',
      homeRegion: 'samarkand',
      interests: ['peaks', 'lakes'],
      locale: 'ru',
    });

    const cleared = await patch(account, {
      displayName: '   ',
      bio: '',
      homeRegion: null,
      interests: [],
    }).expect(200);
    expect(cleared.body).toMatchObject({
      displayName: null,
      bio: null,
      homeRegion: null,
      interests: [],
    });
  });

  it('PATCH /v1/me answers 400 VALIDATION_FAILED with field errors', async () => {
    const account = await signUp(app);
    for (const body of [
      { displayName: 'a' },
      { displayName: 'x'.repeat(41) },
      { bio: 'x'.repeat(151) },
      { homeRegion: 'atlantis' },
      { interests: ['peaks', 'peaks'] },
      { interests: ['peaks', 'caves', 'lakes', 'camping', 'trails', 'other'] },
      { locale: 'fr' },
      { unknown: true },
    ]) {
      const res = await patch(account, body).expect(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.fieldErrors).toBeTruthy();
    }
    expect((await me(account).expect(200)).body.displayName).toBeNull();
  });

  it('GET /v1/users/:username is case-insensitive, public-only and privacy-aware', async () => {
    const account = await signUp(app);
    await patch(account, {
      displayName: 'Sardor',
      bio: 'Explorer',
      homeRegion: 'samarkand',
    }).expect(200);
    await prisma.user.update({
      where: { id: account.id },
      data: { showHomeRegion: true },
    });

    const res = await profile(account.username.toUpperCase()).expect(200);
    expect(res.body).toEqual({
      username: account.username,
      displayName: 'Sardor',
      avatarUrl: null,
      bio: 'Explorer',
      homeRegion: 'samarkand',
      level: 1,
      createdAt: expect.any(String),
      showStats: true,
    });
    expect(Number.isNaN(Date.parse(res.body.createdAt))).toBe(false);

    await prisma.user.update({
      where: { id: account.id },
      data: { showHomeRegion: false },
    });
    expect((await profile(account.username).expect(200)).body.homeRegion).toBe(
      null,
    );

    await prisma.user.update({
      where: { id: account.id },
      data: { publicProfile: false },
    });
    const privateProfile = await profile(account.username).expect(404);
    expect(privateProfile.body.code).toBe('PROFILE_NOT_FOUND');

    await prisma.user.update({
      where: { id: account.id },
      data: {
        publicProfile: true,
        blockedAt: new Date(),
        blockReasonCode: 'other',
      },
    });
    const blocked = await profile(account.username).expect(404);
    expect(blocked.body.code).toBe('PROFILE_NOT_FOUND');

    await prisma.user.update({
      where: { id: account.id },
      data: {
        blockedAt: null,
        blockReasonCode: null,
        deletedAt: new Date(),
      },
    });
    const deleted = await profile(account.username).expect(404);
    expect(deleted.body.code).toBe('PROFILE_NOT_FOUND');

    expect((await profile('missing_user').expect(404)).body.code).toBe(
      'PROFILE_NOT_FOUND',
    );
  });
});

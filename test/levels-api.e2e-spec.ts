import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { vi } from 'vitest';
import { seedGameConfig } from '../prisma/seed/seed.js';
import { AppConfig } from '../src/config/app-config.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { type Account, bearer, makeAdmin, signUp } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

// Synthetic places: two open at L1, one at L2, one at L3.
const PLACES = [
  { slug: 'lv-easy-a', requiredLevel: 1, difficulty: 1 },
  { slug: 'lv-easy-b', requiredLevel: 1, difficulty: 1 },
  { slug: 'lv-l2', requiredLevel: 2, difficulty: 2 },
  { slug: 'lv-l3', requiredLevel: 3, difficulty: 3 },
].map((p) => ({
  ...p,
  nameUz: p.slug,
  type: 'peak' as const,
  latitude: 41.31,
  longitude: 69.25,
  elevationM: 1500,
}));

describe('levels API (e2e) - AC3, AC4', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const placeIds: Record<string, string> = {};

  const server = () => app.getHttpServer();
  const grant = (account: Account, body: Record<string, unknown>) =>
    request(server())
      .post('/v1/qa/levels/grant')
      .set(...bearer(account.accessToken))
      .send(body);
  const myLevel = (account: Account) =>
    request(server())
      .get('/v1/me/level')
      .set(...bearer(account.accessToken));

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(
      e2eEnv(db.getConnectionUri(), { QA_TOOLS_ENABLED: 'true' }),
    );
    prisma = app.get(PrismaService);
    await seedGameConfig(prisma);
    for (const data of PLACES) {
      placeIds[data.slug] = (await prisma.place.create({ data })).id;
    }
  });

  afterAll(async () => {
    await app.close();
    await db.stop();
  });

  it('GET /v1/levels: 7 public rows with the seeded numbers and newPlacesCount', async () => {
    const res = await request(server()).get('/v1/levels').expect(200);
    const items = res.body.items as { xp: number; newPlacesCount: number }[];
    expect(items).toHaveLength(7);
    expect(items.map((i) => i.xp)).toEqual([
      0, 300, 1000, 2500, 5000, 9000, 15000,
    ]);
    expect(items.map((i) => i.newPlacesCount)).toEqual([2, 1, 1, 0, 0, 0, 0]);
    expect(res.body.items[2]).toMatchObject({
      lessons: { kind: 'tier', tier: '2', required: 6 },
      checkIns: { required: 5, minDifficulty: 2 },
      maxDifficulty: 3,
    });
  });

  it('QA grant → L2 with one pending level-up; seen 204 twice clears it; other user 404', async () => {
    const user = await signUp(app);
    const granted = await grant(user, {
      xp: 300,
      lessons: [{ tier: '1' }, { tier: '1' }],
      checkIns: [{ difficulty: 1 }, { difficulty: 1 }],
    }).expect(200);
    expect(granted.body.level).toBe(2);

    const me = await myLevel(user).expect(200);
    expect(me.body).toMatchObject({
      level: 2,
      xpTotal: 300,
      next: {
        level: 3,
        xp: { current: 300, required: 1000 },
        lessons: { current: 0, required: 6, kind: 'tier', tier: '2' },
        checkIns: { current: 0, required: 5, minDifficulty: 2 },
        verifiedSpots: null,
      },
    });
    expect(me.body.pendingLevelUps).toEqual([
      {
        id: expect.any(String),
        fromLevel: 1,
        toLevel: 2,
        maxDifficulty: 2,
        newPlacesCount: 1,
      },
    ]);
    const levelUpId = me.body.pendingLevelUps[0].id as string;

    const other = await signUp(app);
    const notMine = await request(server())
      .post(`/v1/me/level-ups/${levelUpId}/seen`)
      .set(...bearer(other.accessToken))
      .expect(404);
    expect(notMine.body.code).toBe('LEVEL_UP_NOT_FOUND');

    for (let i = 0; i < 2; i += 1) {
      await request(server())
        .post(`/v1/me/level-ups/${levelUpId}/seen`)
        .set(...bearer(user.accessToken))
        .expect(204);
    }
    expect((await myLevel(user).expect(200)).body.pendingLevelUps).toEqual([]);

    const badId = await request(server())
      .post('/v1/me/level-ups/not-a-uuid/seen')
      .set(...bearer(user.accessToken))
      .expect(400);
    expect(badId.body.code).toBe('VALIDATION_FAILED');
  });

  it('QA grant validates its body and answers 404 NOT_FOUND when QA tools are off', async () => {
    const user = await signUp(app);
    const invalid = await grant(user, {
      xp: 20_001,
      checkIns: [{ difficulty: 6 }],
    }).expect(400);
    expect(invalid.body.code).toBe('VALIDATION_FAILED');

    const off = vi
      .spyOn(app.get(AppConfig), 'qaToolsEnabled', 'get')
      .mockReturnValue(false);
    try {
      const unknown = await request(server())
        .post('/v1/qa/levels/unknown-route')
        .set(...bearer(user.accessToken))
        .expect(404);
      const disabled = await grant(user, { xp: 1 }).expect(404);
      expect(disabled.body.code).toBe('NOT_FOUND');
      expect(disabled.body.message).toBe(unknown.body.message);
      const invalidWhenOff = await grant(user, { xp: 0 }).expect(404);
      expect(invalidWhenOff.body.code).toBe('NOT_FOUND');
    } finally {
      off.mockRestore();
    }
    expect((await myLevel(user).expect(200)).body.xpTotal).toBe(0);
  });

  it('GET /v1/places/:id: viewer level from a valid token; bad token or blocked account → guest at L1', async () => {
    const user = await signUp(app);
    await grant(user, {
      xp: 300,
      lessons: [{ tier: '1' }, { tier: '1' }],
      checkIns: [{ difficulty: 1 }, { difficulty: 1 }],
    }).expect(200);
    const url = `/v1/places/${placeIds['lv-l2']}`;

    const signedIn = await request(server())
      .get(url)
      .set(...bearer(user.accessToken))
      .expect(200);
    expect(signedIn.body.viewer).toEqual({ level: 2, qualifies: true });

    const badToken = await request(server())
      .get(url)
      .set(...bearer('not-a-valid-token'))
      .expect(200);
    expect(badToken.body.viewer).toEqual({ level: 1, qualifies: false });

    await prisma.user.update({
      where: { id: user.id },
      data: { blockedAt: new Date(), blockReasonCode: 'other' },
    });
    const blocked = await request(server())
      .get(url)
      .set(...bearer(user.accessToken))
      .expect(200);
    expect(blocked.body.viewer).toEqual({ level: 1, qualifies: false });
  });

  it('GET /v1/me and admin user detail show the real level after a grant', async () => {
    const user = await signUp(app);
    await grant(user, {
      xp: 300,
      lessons: [{ tier: '1' }, { tier: '1' }],
      checkIns: [{ difficulty: 1 }, { difficulty: 1 }],
    }).expect(200);
    const me = await request(server())
      .get('/v1/me')
      .set(...bearer(user.accessToken))
      .expect(200);
    expect(me.body).toMatchObject({ level: 2, xpTotal: 300 });

    const admin = await makeAdmin(app);
    const detail = await request(server())
      .get(`/v1/admin/users/${user.id}`)
      .set(...bearer(admin.accessToken))
      .expect(200);
    expect(detail.body.level).toBe(2);
  });
});

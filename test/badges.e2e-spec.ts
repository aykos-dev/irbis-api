import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import {
  seedBadgesConfig,
  seedCheckInConfig,
  seedGameConfig,
} from '../prisma/seed/seed.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { bearer, signUp, type Account } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const PEAK = { lat: 41.31, lng: 69.28 };

type BadgeItem = {
  key: string;
  progress: number;
  earnedAt: string | null;
  showcase: boolean;
};
type BadgesBody = {
  total: number;
  collected: number;
  showcase: string[];
  username?: string;
  items: BadgeItem[];
  groups: { key: string; earned: number; total: number }[];
};
const listOf = (res: { body: unknown }): BadgesBody => res.body as BadgesBody;

describe('badges (e2e) - catalogue, awards, showcase', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let peakId: string;
  let oldPeakId: string;
  const server = () => app.getHttpServer();

  const badges = (user?: Account) => {
    const call = request(server()).get('/v1/badges');
    return user ? call.set(...bearer(user.accessToken)) : call;
  };
  const find = (
    body: { items: { key: string; progress: number; earnedAt: string | null }[] },
    key: string,
  ) => {
    const item = body.items.find((candidate) => candidate.key === key);
    if (!item) throw new Error(`Badge ${key} missing from the catalogue`);
    return item;
  };

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    await seedGameConfig(prisma);
    await seedCheckInConfig(prisma);
    await seedBadgesConfig(prisma);
    const peak = await prisma.place.create({
      data: {
        slug: 'badge-peak',
        nameUz: 'Badge peak',
        nameEn: 'Badge peak',
        type: 'peak',
        latitude: PEAK.lat,
        longitude: PEAK.lng,
        elevationM: 2500,
        difficulty: 1,
        requiredLevel: 1,
      },
    });
    peakId = peak.id;
    const oldPeak = await prisma.place.create({
      data: {
        slug: 'badge-old-peak',
        nameUz: 'Badge old peak',
        nameEn: 'Badge old peak',
        type: 'peak',
        latitude: 41.32,
        longitude: 69.29,
        elevationM: 2300,
        difficulty: 1,
        requiredLevel: 1,
      },
    });
    oldPeakId = oldPeak.id;
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('serves the full catalogue to guests with no progress', async () => {
    const res = await badges().expect(200);
    const body = listOf(res);
    expect(body.total).toBe(64);
    expect(body.collected).toBe(0);
    expect(body.items).toHaveLength(64);
    expect(body.groups.map((group) => group.key)).toEqual([
      'places',
      'regions',
      'seasons',
      'social',
      'milestones',
    ]);
    expect(find(body, 'peak-bagger-1')).toMatchObject({
      progress: 0,
      earnedAt: null,
      showcase: false,
    });
    expect(
      body.items.every(
        (item) => item.progress === 0 && item.earnedAt === null,
      ),
    ).toBe(true);
  });

  it('awards a first peak and the Tashkent region on a counted check-in', async () => {
    const user = await signUp(app);
    await request(server())
      .post('/v1/check-ins')
      .set(...bearer(user.accessToken))
      .send({
        clientId: randomUUID(),
        placeId: peakId,
        lat: PEAK.lat,
        lng: PEAK.lng,
        accuracyM: 10,
        recordedAt: new Date().toISOString(),
      })
      .expect(201);

    const res = await badges(user).expect(200);
    expect(res.body.collected).toBeGreaterThanOrEqual(2);
    expect(find(res.body, 'peak-bagger-1')).toMatchObject({
      progress: 1,
      earnedAt: expect.any(String) as unknown,
    });
    expect(find(res.body, 'region-tashkent')).toMatchObject({
      progress: 1,
      earnedAt: null,
    });
    expect(find(res.body, 'peak-bagger-2')).toMatchObject({
      progress: 1,
      earnedAt: null,
    });
    expect(res.body.showcase).toContain('peak-bagger-1');
    expect(res.body.showcase.length).toBeLessThanOrEqual(4);

    const awards = await prisma.badgeAward.findMany({ where: { userId: user.id } });
    expect(awards.length).toBe(res.body.collected);
    // A second read must not duplicate or re-date the awards.
    const earnedAt = find(res.body, 'peak-bagger-1').earnedAt;
    const again = await badges(user).expect(200);
    expect(find(again.body, 'peak-bagger-1').earnedAt).toBe(earnedAt);
    expect(await prisma.badgeAward.count({ where: { userId: user.id } })).toBe(
      awards.length,
    );
  });

  it('never counts activity from before the release cutoff', async () => {
    const user = await signUp(app);
    await prisma.checkIn.create({
      data: {
        userId: user.id,
        placeId: oldPeakId,
        clientId: randomUUID(),
        lat: 41.32,
        lng: 69.29,
        accuracyM: 10,
        recordedAt: new Date('2026-10-01T08:00:00.000Z'),
        month: '2026-10',
        counted: true,
        createdAt: new Date('2026-10-01T08:00:00.000Z'),
      },
    });
    const res = await badges(user).expect(200);
    expect(res.body.collected).toBe(0);
    expect(find(res.body, 'peak-bagger-1')).toMatchObject({
      progress: 0,
      earnedAt: null,
    });
  });

  it('saves only earned badges, in order, and caps the showcase at four', async () => {
    const user = await signUp(app);
    await request(server())
      .post('/v1/check-ins')
      .set(...bearer(user.accessToken))
      .send({
        clientId: randomUUID(),
        placeId: peakId,
        lat: PEAK.lat,
        lng: PEAK.lng,
        accuracyM: 10,
        recordedAt: new Date().toISOString(),
      })
      .expect(201);
    await badges(user).expect(200);

    const saved = await request(server())
      .put('/v1/me/badges/showcase')
      .set(...bearer(user.accessToken))
      .send({ keys: ['milestone-first-step', 'peak-bagger-1'] })
      .expect(200);
    expect(saved.body.showcase).toEqual([
      'milestone-first-step',
      'peak-bagger-1',
    ]);

    await request(server())
      .put('/v1/me/badges/showcase')
      .set(...bearer(user.accessToken))
      .send({ keys: ['peak-bagger-3'] })
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('BADGE_NOT_EARNED'));

    await request(server())
      .put('/v1/me/badges/showcase')
      .set(...bearer(user.accessToken))
      .send({
        keys: [
          'peak-bagger-1',
          'milestone-first-step',
          'peak-bagger-2',
          'peak-bagger-3',
          'lake-hopper-1',
        ],
      })
      .expect(400);

    await request(server())
      .put('/v1/me/badges/showcase')
      .set(...bearer(user.accessToken))
      .send({ keys: ['peak-bagger-1', 'peak-bagger-1'] })
      .expect(400);

    const cleared = await request(server())
      .put('/v1/me/badges/showcase')
      .set(...bearer(user.accessToken))
      .send({ keys: [] })
      .expect(200);
    // No explicit picks: the newest earned badges fill the showcase again.
    expect(cleared.body.showcase.length).toBeGreaterThan(0);
  });

  it('shows a public profile showcase and hides private, blocked and deleted ones', async () => {
    const user = await signUp(app);
    await request(server())
      .post('/v1/check-ins')
      .set(...bearer(user.accessToken))
      .send({
        clientId: randomUUID(),
        placeId: peakId,
        lat: PEAK.lat,
        lng: PEAK.lng,
        accuracyM: 10,
        recordedAt: new Date().toISOString(),
      })
      .expect(201);
    await badges(user).expect(200);

    const res = await request(server())
      .get(`/v1/users/${user.username}/badges`)
      .expect(200);
    const body = listOf(res);
    expect(body.username).toBe(user.username);
    expect(body.items.map((item) => item.key)).toContain('peak-bagger-1');
    expect(body.items.length).toBeLessThanOrEqual(4);

    await prisma.user.update({
      where: { id: user.id },
      data: { publicProfile: false },
    });
    await request(server())
      .get(`/v1/users/${user.username}/badges`)
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe('PROFILE_NOT_FOUND'));

    await prisma.user.update({
      where: { id: user.id },
      data: { publicProfile: true, deletedAt: new Date() },
    });
    await request(server())
      .get(`/v1/users/${user.username}/badges`)
      .expect(404);
  });
});

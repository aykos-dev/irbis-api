import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { seedGameConfig, seedPathConfig } from '../prisma/seed/seed.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { bearer, signUp } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const ORIGIN = { lat: 41.3111, lng: 69.2797 };
type Status = 'go' | 'not_now';

// Synthetic places north of the origin, `km` away.
const PLACES = [
  { slug: 'wp-peak', type: 'peak', km: 3, status: 'go' },
  { slug: 'wp-cave', type: 'cave', km: 4, status: 'go' },
  { slug: 'wp-lake-a', type: 'lake', km: 5, status: 'go' },
  { slug: 'wp-falls-b', type: 'waterfall', km: 6, status: 'not_now' },
  { slug: 'wp-lake-c', type: 'lake', km: 7, status: 'go' },
  { slug: 'wp-falls-d', type: 'waterfall', km: 30, status: 'go' },
  { slug: 'wp-peak-l3', type: 'peak', km: 1, status: 'go', requiredLevel: 3 },
] as const;

const isoDay = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

describe('weekly path API (e2e) - AC1, AC2, AC3, AC7', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    await seedGameConfig(prisma);
    await seedPathConfig(prisma);
    for (const p of PLACES) {
      const created = await prisma.place.create({
        data: {
          slug: p.slug,
          nameUz: p.slug,
          type: p.type,
          latitude: ORIGIN.lat + p.km / 111.2,
          longitude: ORIGIN.lng,
          elevationM: 1000 + p.km * 10,
          difficulty: 1,
          requiredLevel: 'requiredLevel' in p ? p.requiredLevel : 1,
        },
      });
      const status: Status = p.status;
      await prisma.placeCondition.create({
        data: {
          placeId: created.id,
          status,
          source: 'forecast',
          reasons:
            status === 'not_now'
              ? [{ code: 'GUSTS', day: 'sun', value: 70 }]
              : [{ code: 'GOOD_WEATHER', day: 'sat', value: 10 }],
          hazardLevels: [],
          weekend: [],
          computedAt: new Date(),
        },
      });
    }
    const days = Array.from({ length: 9 }, (_, i) => isoDay(i - 1));
    await prisma.pointForecast.create({
      data: {
        key: 'tashkent',
        fetchedAt: new Date(),
        daily: {
          time: days,
          weather_code: days.map(() => 1),
          temperature_2m_max: days.map(() => 21.4),
          wind_speed_10m_max: days.map(() => 12.6),
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await db.stop();
  });

  it('guest with interests: level 1 path from lakes, swap for the not_now node, nothing stored', async () => {
    const res = await request(server())
      .get('/v1/path?interests=lakes')
      .expect(200);
    expect(res.body.level).toBe(1);
    expect(res.body.month).toMatch(/^\d{4}-\d{2}$/);
    const nodes = res.body.nodes as {
      position: number;
      place: { slug: string };
      status: string;
      weekendDay: string;
      done: boolean;
      swap: Record<string, unknown> | null;
    }[];
    expect(nodes.map((n) => n.place.slug)).toEqual([
      'wp-lake-a',
      'wp-falls-b',
      'wp-lake-c',
    ]);
    expect(nodes.map((n) => n.position)).toEqual([1, 2, 3]);
    expect(nodes[1]).toMatchObject({
      status: 'not_now',
      weekendDay: 'sun',
      done: false,
      swap: {
        place: { slug: 'wp-falls-d' },
        status: 'go',
        day: 'sat',
        distanceFromOriginalKm: 24,
        elevationDiffM: 240,
      },
    });
    expect(nodes[0].swap).toBeNull();
    expect(res.body.chest).toEqual({
      required: 3,
      done: 0,
      opened: false,
      xp: 50,
    });
    const days = res.body.weather.days as { tMaxC: number; day: string }[];
    expect(days.length).toBeGreaterThan(0);
    expect(days[0]).toMatchObject({ tMaxC: 21, windKmh: 13, weatherCode: 1 });
    expect(await prisma.pathMonth.count()).toBe(0);
  });

  it('400 VALIDATION_FAILED for an unknown interest', async () => {
    const res = await request(server())
      .get('/v1/path?interests=lakes,volcanoes')
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it('signed in: stores the month and returns the same nodes after the interests change', async () => {
    const user = await signUp(app);
    await prisma.user.update({
      where: { id: user.id },
      data: { interests: ['peaks'] },
    });
    const get = () =>
      request(server())
        .get('/v1/path?interests=lakes')
        .set(...bearer(user.accessToken))
        .expect(200);

    const first = await get();
    const slugsOf = (body: { nodes: { place: { slug: string } }[] }) =>
      body.nodes.map((n) => n.place.slug);
    // Query interests are ignored for a user; level 3 peak is not open at level 1.
    expect(slugsOf(first.body)).toEqual(['wp-peak']);
    expect(first.body.chest).toMatchObject({ required: 1, done: 0 });
    expect(await prisma.pathMonth.count({ where: { userId: user.id } })).toBe(
      1,
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { interests: ['caves'] },
    });
    const second = await get();
    expect(slugsOf(second.body)).toEqual(['wp-peak']);
    expect(second.body.month).toBe(first.body.month);
  });
});

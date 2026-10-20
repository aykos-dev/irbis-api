import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { vi } from 'vitest';
import { seedGameConfig, seedPathConfig } from '../prisma/seed/seed.js';
import { AppConfig } from '../src/config/app-config.js';
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

  describe('visits and chest - AC4, AC5', () => {
    beforeAll(() => {
      vi.spyOn(app.get(AppConfig), 'qaToolsEnabled', 'get').mockReturnValue(
        true,
      );
    });

    afterAll(() => {
      vi.restoreAllMocks();
    });

    const visit = (token: string, placeId: string) =>
      request(server())
        .post('/v1/qa/path/visits')
        .set(...bearer(token))
        .send({ placeId });
    const openChest = (token: string) =>
      request(server())
        .post('/v1/path/chest/open')
        .set(...bearer(token));
    const getPath = (token: string) =>
      request(server())
        .get('/v1/path')
        .set(...bearer(token))
        .expect(200);
    const xpTotal = async (userId: string) =>
      (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).xpTotal;
    const placeIdOf = async (slug: string) =>
      (await prisma.place.findUniqueOrThrow({ where: { slug } })).id;
    type PathBody = {
      month: string;
      nodes: { place: { id: string; slug: string }; done: boolean }[];
    };
    const doneOf = (body: PathBody) =>
      body.nodes.filter((n) => n.done).map((n) => n.place.slug);

    it('visits fill the path; chest locked at 2/3, opens at 3/3 for +50 XP once', async () => {
      const user = await signUp(app);
      const path = (await getPath(user.accessToken)).body as PathBody;
      const [a, b, c] = path.nodes.map((n) => n.place);
      expect(path.nodes).toHaveLength(3);

      const first = await visit(user.accessToken, a.id).expect(200);
      expect(doneOf(first.body)).toEqual([a.slug]);
      await visit(user.accessToken, b.id).expect(200);
      const two = await getPath(user.accessToken);
      expect(doneOf(two.body)).toEqual([a.slug, b.slug]);
      expect(two.body.chest).toMatchObject({
        required: 3,
        done: 2,
        opened: false,
      });

      const locked = await openChest(user.accessToken).expect(409);
      expect(locked.body.code).toBe('PATH_CHEST_LOCKED');

      await visit(user.accessToken, c.id).expect(200);
      const before = await xpTotal(user.id);
      const opened = await openChest(user.accessToken).expect(200);
      expect(opened.body).toMatchObject({ opened: true, xp: 50 });
      expect(Array.isArray(opened.body.levelUps)).toBe(true);
      expect(await xpTotal(user.id)).toBe(before + 50);

      const again = await openChest(user.accessToken).expect(200);
      expect(again.body).toEqual({ opened: true, xp: 0, levelUps: [] });
      expect(await xpTotal(user.id)).toBe(before + 50);

      const after = await getPath(user.accessToken);
      expect(after.body.chest).toMatchObject({
        required: 3,
        done: 3,
        opened: true,
      });
    });

    it('404 PLACE_NOT_ON_PATH and 400 VALIDATION_FAILED on the QA visit', async () => {
      const user = await signUp(app);
      const off = await visit(
        user.accessToken,
        await placeIdOf('wp-peak-l3'),
      ).expect(404);
      expect(off.body.code).toBe('PLACE_NOT_ON_PATH');
      const bad = await visit(user.accessToken, 'not-a-uuid').expect(400);
      expect(bad.body.code).toBe('VALIDATION_FAILED');
    });

    it("another month's path and visits don't count: 404 without a path, 409 with old visits", async () => {
      const user = await signUp(app);
      const longAgo = new Date('2000-01-15T08:00:00Z');
      const slugs = ['wp-peak', 'wp-cave', 'wp-lake-a'];
      const placeIds = await Promise.all(slugs.map(placeIdOf));
      await prisma.pathMonth.create({
        data: {
          userId: user.id,
          month: '2000-01',
          level: 1,
          nodes: {
            create: placeIds.map((placeId, i) => ({
              placeId,
              position: i + 1,
              visitedAt: longAgo,
            })),
          },
        },
      });
      const none = await openChest(user.accessToken).expect(404);
      expect(none.body.code).toBe('PATH_NOT_FOUND');

      const path = await getPath(user.accessToken);
      await prisma.pathNode.updateMany({
        where: { pathMonth: { userId: user.id, month: path.body.month } },
        data: { visitedAt: longAgo },
      });
      const locked = await openChest(user.accessToken).expect(409);
      expect(locked.body.code).toBe('PATH_CHEST_LOCKED');
    });

    it('401 for a guest', async () => {
      await request(server()).post('/v1/path/chest/open').expect(401);
    });
  });
});

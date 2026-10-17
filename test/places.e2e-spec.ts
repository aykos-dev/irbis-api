import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { bearer, signUp } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const slugs = (body: { items: { slug: string }[] }): string[] =>
  body.items.map((item) => item.slug);

// Synthetic places around Tashkent (41.2995, 69.2401).
const PLACES = [
  {
    slug: 'near-peak-2000',
    nameUz: 'Near peak',
    type: 'peak',
    latitude: 41.31,
    longitude: 69.25,
    elevationM: 2000,
    difficulty: 2,
    requiredLevel: 2,
  },
  {
    slug: 'mid-lake-1200',
    nameUz: 'Mid lake',
    type: 'lake',
    latitude: 41.6,
    longitude: 69.9,
    elevationM: 1200,
    difficulty: 1,
    requiredLevel: 1,
  },
  {
    slug: 'far-peak-3900',
    nameUz: 'Far peak',
    type: 'peak',
    latitude: 39.65,
    longitude: 66.96,
    elevationM: 3900,
    difficulty: 5,
    requiredLevel: 7,
  },
] as const;

describe('places (e2e) - AC2, AC3', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  const ids: Record<string, string> = {};

  const server = () => app.getHttpServer();

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    const prisma = app.get(PrismaService);
    for (const data of PLACES) {
      const row = await prisma.place.create({ data });
      ids[data.slug] = row.id;
    }
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('AC2: lists without a token, sorted by distance from Tashkent, with integer distanceM and total', async () => {
    const res = await request(server()).get('/v1/places').expect(200);
    expect(res.body.origin).toBe('tashkent');
    expect(res.body.total).toBe(3);
    expect(res.body.nextCursor).toBeNull();
    expect(slugs(res.body)).toEqual([
      'near-peak-2000',
      'mid-lake-1200',
      'far-peak-3900',
    ]);
    expect(res.body.items[0]).toEqual({
      id: ids['near-peak-2000'],
      slug: 'near-peak-2000',
      name: { uz: 'Near peak', ru: null, en: null },
      type: 'peak',
      latitude: 41.31,
      longitude: 69.25,
      elevationM: 2000,
      difficulty: 2,
      requiredLevel: 2,
      distanceM: expect.any(Number),
    });
    expect(Number.isInteger(res.body.items[0].distanceM)).toBe(true);

    const fromDevice = await request(server())
      .get('/v1/places?lat=39.65&lng=66.96&limit=1')
      .expect(200);
    expect(fromDevice.body.origin).toBe('device');
    expect(fromDevice.body.items[0]).toMatchObject({
      slug: 'far-peak-3900',
      distanceM: 0,
    });
    expect(fromDevice.body.nextCursor).toEqual(expect.any(String));
  });

  it('AC2: filters combine with AND; types accept repeated keys and a comma list', async () => {
    const peaksNear = await request(server())
      .get('/v1/places?types=peak&types=cave&maxDistanceKm=100')
      .expect(200);
    expect(slugs(peaksNear.body)).toEqual(['near-peak-2000']);
    expect(peaksNear.body.total).toBe(1);

    const easy = await request(server())
      .get('/v1/places?types=peak,lake&difficultyMin=1&difficultyMax=2')
      .expect(200);
    expect(easy.body.total).toBe(2);
  });

  it('AC2: 400 VALIDATION_FAILED for lat without lng, out-of-range coordinates, min > max, an unknown type', async () => {
    for (const qs of [
      'lat=41.3',
      'lng=69.2',
      'lat=91&lng=69',
      'lat=41&lng=181',
      'difficultyMin=4&difficultyMax=2',
      'types=volcano',
      'limit=201',
    ]) {
      const res = await request(server()).get(`/v1/places?${qs}`).expect(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
    }
  });

  it('AC3: detail works with or without a token and has the same viewer', async () => {
    const id = ids['near-peak-2000'];
    const guest = await request(server()).get(`/v1/places/${id}`).expect(200);
    expect(guest.body).toMatchObject({
      id,
      region: null,
      description: { uz: null, ru: null, en: null },
      season: [],
      hazards: [],
      origin: 'tashkent',
      viewer: { level: 1, qualifies: false },
    });
    const account = await signUp(app);
    const signedIn = await request(server())
      .get(`/v1/places/${id}?lat=41.31&lng=69.25`)
      .set(...bearer(account.accessToken))
      .expect(200);
    expect(signedIn.body).toMatchObject({
      origin: 'device',
      distanceM: 0,
      viewer: { level: 1, qualifies: false },
    });
    const easy = await request(server())
      .get(`/v1/places/${ids['mid-lake-1200']}`)
      .expect(200);
    expect(easy.body.viewer).toEqual({ level: 1, qualifies: true });
  });

  it('AC3: 404 PLACE_NOT_FOUND for an unknown uuid, 400 VALIDATION_FAILED for a non-uuid', async () => {
    const missing = await request(server())
      .get('/v1/places/0190a6a2-0000-7000-8000-000000000000')
      .expect(404);
    expect(missing.body.code).toBe('PLACE_NOT_FOUND');
    const bad = await request(server())
      .get('/v1/places/not-a-uuid')
      .expect(400);
    expect(bad.body.code).toBe('VALIDATION_FAILED');
  });
});

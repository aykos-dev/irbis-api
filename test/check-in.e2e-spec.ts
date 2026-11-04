import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import {
  seedCheckInConfig,
  seedGameConfig,
  seedPathConfig,
} from '../prisma/seed/seed.js';
import { checkInMonth } from '../src/features/check-in/check-in.rules.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { bearer, signUp, type Account } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const PEAK = { lat: 41.31, lng: 69.28 };

describe('check-in (e2e) - AC1, AC2, AC3', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let placeId: string;
  const server = () => app.getHttpServer();

  const checkIn = (
    user: Account,
    fields: Partial<Record<string, unknown>> = {},
  ) =>
    request(server())
      .post('/v1/check-ins')
      .set(...bearer(user.accessToken))
      .send({
        clientId: randomUUID(),
        placeId,
        lat: PEAK.lat,
        lng: PEAK.lng,
        accuracyM: 10,
        recordedAt: new Date().toISOString(),
        ...fields,
      });

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    await seedGameConfig(prisma);
    await seedPathConfig(prisma);
    await seedCheckInConfig(prisma);
    const place = await prisma.place.create({
      data: {
        slug: 'ci-peak',
        nameUz: 'ci-peak',
        type: 'peak',
        latitude: PEAK.lat,
        longitude: PEAK.lng,
        elevationM: 2000,
        difficulty: 2,
        requiredLevel: 1,
      },
    });
    placeId = place.id;
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('AC1: 201 counted with XP, level fact and path visit; same month repeat is uncounted; same clientId replays 200', async () => {
    const user = await signUp(app);
    await prisma.pathMonth.create({
      data: {
        userId: user.id,
        month: checkInMonth(new Date()),
        level: 1,
        nodes: { create: [{ placeId, position: 1 }] },
      },
    });
    const clientId = randomUUID();

    const first = await checkIn(user, { clientId }).expect(201);
    expect(first.body).toMatchObject({
      placeId,
      counted: true,
      xp: 60,
      levelUps: [],
      pathVisited: true,
    });
    const xp = await prisma.xpEntry.findMany({ where: { userId: user.id } });
    expect(xp).toMatchObject([
      { source: 'check_in', refId: first.body.id, amount: 60 },
    ]);
    expect(
      await prisma.levelFact.count({
        where: { userId: user.id, kind: 'check_in', refId: first.body.id },
      }),
    ).toBe(1);
    const node = await prisma.pathNode.findFirst({
      where: { placeId, pathMonth: { userId: user.id } },
    });
    expect(node?.visitedAt).not.toBeNull();

    const repeat = await checkIn(user).expect(201);
    expect(repeat.body).toMatchObject({ counted: false, xp: 0 });

    const replay = await checkIn(user, { clientId }).expect(200);
    expect(replay.body).toEqual(first.body);
    expect(await prisma.xpEntry.count({ where: { userId: user.id } })).toBe(1);
  });

  it('AC2/AC3: 422 too far with details, 422 inaccurate, 422 too old, 400 future, 404 unknown place', async () => {
    const user = await signUp(app);
    const far = await checkIn(user, { lat: PEAK.lat + 0.01 }).expect(422);
    expect(far.body).toMatchObject({
      code: 'CHECK_IN_TOO_FAR',
      details: { distanceM: expect.any(Number), radiusM: 300 },
    });
    expect(Number.isInteger(far.body.details.distanceM)).toBe(true);

    const blurry = await checkIn(user, { accuracyM: 80 }).expect(422);
    expect(blurry.body.code).toBe('LOCATION_INACCURATE');

    const old = await checkIn(user, {
      recordedAt: new Date(Date.now() - 73 * 3_600_000).toISOString(),
    }).expect(422);
    expect(old.body.code).toBe('CHECK_IN_TOO_OLD');

    const future = await checkIn(user, {
      recordedAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    }).expect(400);
    expect(future.body.code).toBe('VALIDATION_FAILED');

    const missing = await checkIn(user, { placeId: randomUUID() }).expect(404);
    expect(missing.body.code).toBe('PLACE_NOT_FOUND');
  });

  it('place detail carries checkInRadiusM for its type', async () => {
    const res = await request(server())
      .get(`/v1/places/${placeId}`)
      .expect(200);
    expect(res.body.checkInRadiusM).toBe(300);
  });

  it('401 for a guest', async () => {
    await request(server()).post('/v1/check-ins').send({}).expect(401);
  });
});

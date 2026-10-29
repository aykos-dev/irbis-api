import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { seedGameConfig, seedStreaksConfig } from '../prisma/seed/seed.js';
import { tashkentDate } from '../src/features/conditions/weekend-window.js';
import {
  addDays,
  mondayOf,
  monthOf,
} from '../src/features/streaks/streaks.rules.js';
import { StreaksService } from '../src/features/streaks/streaks.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { bearer, signUp } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const day = (value: string) => new Date(`${value}T00:00:00Z`);

describe('streaks weather shield (e2e) - AC3', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let seq = 0;

  const createPlace = async () => {
    seq += 1;
    const place = await prisma.place.create({
      data: {
        slug: `shield-peak-${seq}`,
        nameUz: `shield-peak-${seq}`,
        type: 'peak',
        latitude: 41.3,
        longitude: 69.3,
        elevationM: 2000,
        difficulty: 1,
        requiredLevel: 1,
      },
    });
    return place.id;
  };

  const addPath = async (userId: string, month: string, placeId: string) => {
    await prisma.pathMonth.create({
      data: {
        userId,
        month,
        level: 1,
        nodes: { create: [{ position: 1, placeId }] },
      },
    });
  };

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    await seedGameConfig(prisma);
    await seedStreaksConfig(prisma);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('the weekend job writes today’s current status for path places', async () => {
    const user = await signUp(app);
    const placeId = await createPlace();
    const now = new Date();
    const today = tashkentDate(now);
    await addPath(user.id, monthOf(today), placeId);
    await prisma.placeCondition.create({
      data: {
        placeId,
        status: 'not_now',
        source: 'forecast',
        reasons: [],
        hazardLevels: [],
        weekend: [],
        computedAt: now,
      },
    });

    await app.get(StreaksService).recordWeekendConditions(now);

    const row = await prisma.weekendCondition.findUnique({
      where: { placeId_date: { placeId, date: day(today) } },
    });
    expect(row?.status).toBe('not_now');
  });

  it('GET /v1/me/streaks keeps the boot through a shielded empty week', async () => {
    const user = await signUp(app);
    const today = tashkentDate(new Date());
    const lastMonday = addDays(mondayOf(today), -7);
    const saturday = addDays(lastMonday, 5);
    const sunday = addDays(lastMonday, 6);
    const pathPlace = await createPlace();
    const tripPlace = await createPlace();
    await addPath(user.id, monthOf(saturday), pathPlace);
    await prisma.trip.create({
      data: {
        userId: user.id,
        placeId: tripPlace,
        status: 'checked_out',
        startAt: new Date(`${sunday}T08:00:00+05:00`),
        backBy: new Date(`${sunday}T18:00:00+05:00`),
        alertEnabled: false,
        contactName: 'contact',
        contactRelation: 'friend',
        contactPhone: 'ciphertext',
        contactPhoneLast2: '00',
      },
    });
    // A check-in on the Sunday before last starts the boot; last week has none.
    await prisma.activityDay.create({
      data: { userId: user.id, day: day(addDays(lastMonday, -1)), checkIns: 1 },
    });
    await prisma.weekendCondition.createMany({
      data: [pathPlace, tripPlace].flatMap((placeId) => [
        { placeId, date: day(saturday), status: 'not_now' as const },
        { placeId, date: day(sunday), status: 'seasonal_lock' as const },
      ]),
    });

    const res = await request(app.getHttpServer())
      .get('/v1/me/streaks')
      .set(...bearer(user.accessToken))
      .expect(200);

    expect(res.body.boot).toEqual({
      count: 1,
      doneThisWeek: false,
      shieldedLastWeek: true,
    });
    const bootFreezes = await prisma.streakFreeze.count({
      where: { userId: user.id, kind: 'boot' },
    });
    expect(bootFreezes).toBe(0);
  });
});

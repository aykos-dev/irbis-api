import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { seedLeaguesConfig } from '../prisma/seed/seed.js';
import { LeaguesService } from '../src/features/leagues/leagues.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { bearer, signUp } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

describe('seasonal leagues (e2e)', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let leagues: LeaguesService;
  let placeId: string;
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    leagues = app.get(LeaguesService);
    await seedLeaguesConfig(prisma);
    const place = await prisma.place.create({
      data: {
        slug: 'league-peak',
        nameUz: 'League peak',
        nameEn: 'League peak',
        type: 'peak',
        latitude: 41.31,
        longitude: 69.28,
        elevationM: 2200,
        difficulty: 1,
        requiredLevel: 1,
      },
    });
    placeId = place.id;
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('requires auth and honestly reports an account without a qualifying trip as unranked', async () => {
    await request(server()).get('/v1/leagues/current').expect(401);
    const user = await signUp(app);
    const res = await request(server())
      .get('/v1/leagues/current')
      .set(...bearer(user.accessToken))
      .expect(200);
    expect(res.body).toMatchObject({
      ranked: false,
      tier: null,
      elevationM: 0,
      standings: [],
    });
    expect(res.body.season.key).toMatch(
      /^\d{4}-(spring|summer|autumn|winter)$/,
    );
  });

  it('records one qualifying tracked trip idempotently and exposes the public summary', async () => {
    const user = await signUp(app);
    const startedAt = new Date('2026-11-05T08:00:00.000Z');
    const checkedOutAt = new Date('2026-11-05T12:00:00.000Z');
    const trip = await prisma.trip.create({
      data: {
        userId: user.id,
        placeId,
        status: 'checked_out',
        startAt: startedAt,
        backBy: checkedOutAt,
        alertEnabled: false,
        contactName: 'Synthetic contact',
        contactRelation: 'friend',
        contactPhone: 'test-ciphertext',
        contactPhoneLast2: '00',
        startedAt,
        checkedOutAt,
        climbM: 620,
        waypoints: {
          create: {
            n: 1,
            lat: 41.31,
            lng: 69.28,
            accuracyM: 10,
            recordedAt: new Date('2026-11-05T10:00:00.000Z'),
            xpAwarded: 10,
          },
        },
      },
    });
    await expect(
      leagues.recordCheckout(user.id, trip.id, checkedOutAt),
    ).resolves.toEqual({ awardedM: 620, seasonalM: 620 });
    await expect(
      leagues.recordCheckout(user.id, trip.id, checkedOutAt),
    ).resolves.toEqual({ awardedM: 0, seasonalM: 620 });

    const current = await request(server())
      .get('/v1/leagues/current')
      .set(...bearer(user.accessToken))
      .expect(200);
    expect(current.body).toMatchObject({
      ranked: true,
      tier: 'scout',
      rank: 1,
      elevationM: 620,
    });
    expect(current.body.standings).toHaveLength(1);

    const summary = await request(server())
      .get(`/v1/users/${user.username}/league`)
      .expect(200);
    expect(summary.body).toMatchObject({
      username: user.username,
      ranked: true,
      tier: 'scout',
      elevationM: 620,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { publicProfile: false },
    });
    await request(server())
      .get(`/v1/users/${user.username}/league`)
      .expect(404);
  });

  it('marks no result as unseen idempotently', async () => {
    const user = await signUp(app);
    await request(server())
      .post('/v1/me/league-result/seen')
      .set(...bearer(user.accessToken))
      .expect(200, { seen: false });
  });
});

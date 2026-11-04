import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { seedTripConfig } from '../prisma/seed/seed.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { bearer, signUp, type Account } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const HOUR_MS = 3_600_000;
// Synthetic contact: guest_2, number ending in 41.
const CONTACT = { name: 'guest_2', relation: 'friend', phone: '+998900000041' };

describe('active trip API (e2e) - AC3, AC4, AC5, AC8', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let placeId: string;
  const server = () => app.getHttpServer();

  const startTrip = async (): Promise<{
    user: Account;
    id: string;
    liveUrl: string;
  }> => {
    const user = await signUp(app);
    await request(server())
      .put('/v1/me/emergency-contact')
      .set(...bearer(user.accessToken))
      .send(CONTACT)
      .expect(200);
    const res = await request(server())
      .post('/v1/trips')
      .set(...bearer(user.accessToken))
      .send({
        placeId,
        startAt: new Date().toISOString(),
        backBy: new Date(Date.now() + 4 * HOUR_MS).toISOString(),
        alertEnabled: true,
        start: true,
      })
      .expect(201);
    return { user, id: res.body.id, liveUrl: res.body.liveUrl };
  };
  const ping = (user: Account, id: string) =>
    request(server())
      .post(`/v1/trips/${id}/locations`)
      .set(...bearer(user.accessToken))
      .send({
        lat: 41.5,
        lng: 69.5,
        accuracyM: 12,
        recordedAt: new Date().toISOString(),
        distanceM: 1200,
        climbM: 80,
      });

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    await seedTripConfig(prisma);
    const place = await prisma.place.create({
      data: {
        slug: 'at-lake',
        nameUz: 'at-lake',
        type: 'lake',
        latitude: 41.31,
        longitude: 69.28,
        elevationM: 1200,
        difficulty: 1,
        requiredLevel: 1,
      },
    });
    placeId = place.id;
  });

  afterAll(async () => {
    await app.close();
    await db.stop();
  });

  it('ping 204 shows on the public live page; check-out stores stats; ping after 409', async () => {
    const { user, id, liveUrl } = await startTrip();
    expect(liveUrl).toMatch(/\/t\/[A-Za-z0-9_-]{22}$/);
    const token = liveUrl.split('/t/')[1];

    await ping(user, id).expect(204);

    const live = await request(server()).get(`/v1/live/${token}`).expect(200);
    expect(live.body).toMatchObject({
      displayName: expect.any(String),
      placeNames: { uz: 'at-lake', ru: 'at-lake', en: 'at-lake' },
      status: 'on_trip',
      mapsUrl: 'https://maps.google.com/?q=41.50000,69.50000',
    });
    expect(JSON.stringify(live.body)).not.toMatch(/contact|phone|"id"/i);

    const out = await request(server())
      .post(`/v1/trips/${id}/check-out`)
      .set(...bearer(user.accessToken))
      .send({ distanceM: 5400, climbM: 310 })
      .expect(200);
    expect(out.body).toMatchObject({
      status: 'checked_out',
      distanceM: 5400,
      climbM: 310,
      liveUrl,
      pingEveryMin: 5,
      waypoints: [],
    });

    const after = await ping(user, id).expect(409);
    expect(after.body.code).toBe('TRIP_NOT_ACTIVE');
    const safe = await request(server()).get(`/v1/live/${token}`).expect(200);
    expect(safe.body.status).toBe('back_safe');
  });

  it('live 404 LIVE_NOT_FOUND for an unknown token', async () => {
    const res = await request(server())
      .get(`/v1/live/${'Z'.repeat(22)}`)
      .expect(404);
    expect(res.body.code).toBe('LIVE_NOT_FOUND');
  });
});

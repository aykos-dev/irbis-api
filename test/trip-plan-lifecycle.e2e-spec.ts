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

describe('trip lifecycle API (e2e) - AC6, AC7', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let placeId: string;
  const server = () => app.getHttpServer();

  const planTrip = (user: Account, fromNowH = 1) => {
    const startAt = new Date(Date.now() + fromNowH * HOUR_MS);
    return request(server())
      .post('/v1/trips')
      .set(...bearer(user.accessToken))
      .send({
        placeId,
        startAt: startAt.toISOString(),
        backBy: new Date(startAt.getTime() + 4 * HOUR_MS).toISOString(),
        alertEnabled: true,
        start: false,
      })
      .expect(201)
      .then((res) => res.body.id as string);
  };
  const userWithContact = async () => {
    const user = await signUp(app);
    await request(server())
      .put('/v1/me/emergency-contact')
      .set(...bearer(user.accessToken))
      .send(CONTACT)
      .expect(200);
    return user;
  };
  const start = (user: Account, id: string) =>
    request(server())
      .post(`/v1/trips/${id}/start`)
      .set(...bearer(user.accessToken))
      .send({ location: { lat: 41.5, lng: 69.5, accuracyM: 12 } });

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    await seedTripConfig(prisma);
    const place = await prisma.place.create({
      data: {
        slug: 'tl-lake',
        nameUz: 'tl-lake',
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

  it('start 200 stores the fix; second start 409; check-out 200; delete active 409', async () => {
    const user = await userWithContact();
    const first = await planTrip(user);
    const second = await planTrip(user, 2);

    const started = await start(user, first).expect(200);
    expect(started.body).toMatchObject({ id: first, status: 'active' });
    expect(typeof started.body.startedAt).toBe('string');
    const row = await prisma.trip.findUniqueOrThrow({ where: { id: first } });
    expect(row).toMatchObject({ startLat: 41.5, startLng: 69.5 });

    const again = await start(user, first).expect(409);
    expect(again.body.code).toBe('TRIP_NOT_EDITABLE');
    const other = await start(user, second).expect(409);
    expect(other.body.code).toBe('TRIP_ALREADY_ACTIVE');

    const del = await request(server())
      .delete(`/v1/trips/${first}`)
      .set(...bearer(user.accessToken))
      .expect(409);
    expect(del.body.code).toBe('TRIP_NOT_EDITABLE');

    const out = await request(server())
      .post(`/v1/trips/${first}/check-out`)
      .set(...bearer(user.accessToken))
      .expect(200);
    expect(out.body.status).toBe('checked_out');
    expect(typeof out.body.checkedOutAt).toBe('string');
  });

  it('delete planned 204; patch 422; other user 404', async () => {
    const user = await userWithContact();
    const id = await planTrip(user);

    const bad = await request(server())
      .patch(`/v1/trips/${id}`)
      .set(...bearer(user.accessToken))
      .send({ backBy: new Date(Date.now()).toISOString() })
      .expect(422);
    expect(bad.body.code).toBe('TRIP_TIMES_INVALID');

    const stranger = await signUp(app);
    const notMine = await request(server())
      .patch(`/v1/trips/${id}`)
      .set(...bearer(stranger.accessToken))
      .send({ alertEnabled: false })
      .expect(404);
    expect(notMine.body.code).toBe('TRIP_NOT_FOUND');

    await request(server())
      .delete(`/v1/trips/${id}`)
      .set(...bearer(user.accessToken))
      .expect(204);
    expect(await prisma.trip.findUnique({ where: { id } })).toBeNull();
  });
});

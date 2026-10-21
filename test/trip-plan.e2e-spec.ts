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
const MASK = '+998 •• ••• •• 41';

describe('trip plan API (e2e) - AC3, AC4, AC6', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let placeId: string;
  const server = () => app.getHttpServer();

  const window = (fromNowH: number, hours: number) => {
    const startAt = new Date(Date.now() + fromNowH * HOUR_MS);
    return {
      startAt: startAt.toISOString(),
      backBy: new Date(startAt.getTime() + hours * HOUR_MS).toISOString(),
    };
  };
  const createTrip = (user: Account, start: boolean) =>
    request(server())
      .post('/v1/trips')
      .set(...bearer(user.accessToken))
      .send({ placeId, ...window(0, 6), alertEnabled: true, start });
  const putContact = (user: Account) =>
    request(server())
      .put('/v1/me/emergency-contact')
      .set(...bearer(user.accessToken))
      .send(CONTACT);

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    await seedTripConfig(prisma);
    const place = await prisma.place.create({
      data: {
        slug: 'tp-lake',
        nameUz: 'tp-lake',
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

  it('emergency contact: 204 before saving, then PUT and GET return only the masked phone', async () => {
    const user = await signUp(app);
    await request(server())
      .get('/v1/me/emergency-contact')
      .set(...bearer(user.accessToken))
      .expect(204);
    const put = await putContact(user).expect(200);
    expect(put.body).toEqual({
      name: CONTACT.name,
      relation: CONTACT.relation,
      phoneMasked: MASK,
    });
    const got = await request(server())
      .get('/v1/me/emergency-contact')
      .set(...bearer(user.accessToken))
      .expect(200);
    expect(got.body).toEqual(put.body);
    const row = await prisma.emergencyContact.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(row.phone).not.toContain('900000041');
    expect(row.phoneLast2).toBe('41');
  });

  it('preview: 200 with sunset and the gear list', async () => {
    const user = await signUp(app);
    const res = await request(server())
      .get(`/v1/places/${placeId}/trip-preview`)
      .query(window(1, 4))
      .set(...bearer(user.accessToken))
      .expect(200);
    expect(typeof res.body.sunsetAt).toBe('string');
    const keys = (res.body.gear as { key: string }[]).map((g) => g.key);
    expect(keys.slice(0, 4)).toEqual([
      'water',
      'warmLayer',
      'firstAid',
      'offlineMap',
    ]);
    expect(keys).toContain('waterFilter');
  });

  it('create: 422 without a contact, 201 active, 409 for a second active, both listed in current', async () => {
    const user = await signUp(app);
    const noContact = await createTrip(user, true).expect(422);
    expect(noContact.body.code).toBe('EMERGENCY_CONTACT_REQUIRED');

    await putContact(user).expect(200);
    const created = await createTrip(user, true).expect(201);
    expect(created.body).toMatchObject({
      status: 'active',
      alertEnabled: true,
      place: { id: placeId, slug: 'tp-lake', type: 'lake' },
      contact: { name: CONTACT.name, phoneMasked: MASK },
    });
    expect(Date.parse(created.body.alertAt)).toBe(
      Date.parse(created.body.backBy) + HOUR_MS,
    );
    expect(JSON.stringify(created.body)).not.toContain('900000041');

    const second = await createTrip(user, true).expect(409);
    expect(second.body.code).toBe('TRIP_ALREADY_ACTIVE');
    const planned = await createTrip(user, false).expect(201);
    expect(planned.body.status).toBe('planned');

    const other = await signUp(app);
    const current = await request(server())
      .get('/v1/trips/current')
      .set(...bearer(user.accessToken))
      .expect(200);
    expect(current.body.active.id).toBe(created.body.id);
    const plannedIds = (current.body.planned as { id: string }[]).map(
      (t) => t.id,
    );
    expect(plannedIds).toEqual([planned.body.id]);
    const otherCurrent = await request(server())
      .get('/v1/trips/current')
      .set(...bearer(other.accessToken))
      .expect(200);
    expect(otherCurrent.body).toEqual({ active: null, planned: [] });
  });
});

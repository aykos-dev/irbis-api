import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { seedGameConfig, seedTripConfig } from '../prisma/seed/seed.js';
import {
  SmsSender,
  type SmsTextMessage,
} from '../src/features/auth/sms-sender.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { bearer, signUp, type Account } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const HOUR_MS = 3_600_000;
// Synthetic contact and rescue number (not real).
const CONTACT = { name: 'guest_2', relation: 'friend', phone: '+998900000041' };
const SOS_NUMBER = '+998000000000';

describe('active trip waypoints + SOS (e2e) - AC6, AC7', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let placeId: string;
  const texts: SmsTextMessage[] = [];
  const server = () => app.getHttpServer();

  const startTrip = async (): Promise<{ user: Account; id: string }> => {
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
    return { user, id: res.body.id };
  };
  const checkIn = (user: Account, id: string, accuracyM = 10) =>
    request(server())
      .post(`/v1/trips/${id}/waypoints`)
      .set(...bearer(user.accessToken))
      .send({
        lat: 41.5,
        lng: 69.5,
        accuracyM,
        recordedAt: new Date().toISOString(),
      });

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(
      e2eEnv(db.getConnectionUri(), { SOS_CALL_NUMBER: SOS_NUMBER }),
    );
    prisma = app.get(PrismaService);
    await seedGameConfig(prisma);
    await seedTripConfig(prisma);
    const sender = app.get(SmsSender);
    const original = sender.sendText.bind(sender);
    vi.spyOn(sender, 'sendText').mockImplementation(async (message) => {
      texts.push(message);
      await original(message);
    });
    const place = await prisma.place.create({
      data: {
        slug: 'ats-lake',
        nameUz: 'ats-lake',
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

  it('waypoint 200 awards XP and lists it; 422 too close, 422 inaccurate; 409 after check-out', async () => {
    const { user, id } = await startTrip();
    const ok = await checkIn(user, id).expect(200);
    expect(ok.body).toMatchObject({
      waypoint: { n: 1, lat: 41.5, lng: 69.5 },
      xpAwarded: 10,
    });

    const close = await checkIn(user, id).expect(422);
    expect(close.body).toMatchObject({
      code: 'WAYPOINT_TOO_CLOSE',
      details: { remainingM: 500 },
    });
    const vague = await checkIn(user, id, 80).expect(422);
    expect(vague.body.code).toBe('LOCATION_INACCURATE');

    const current = await request(server())
      .get('/v1/trips/current')
      .set(...bearer(user.accessToken))
      .expect(200);
    expect(current.body.active.waypoints).toEqual([
      expect.objectContaining({ n: 1, lat: 41.5, lng: 69.5 }),
    ]);

    await request(server())
      .post(`/v1/trips/${id}/check-out`)
      .set(...bearer(user.accessToken))
      .send({})
      .expect(200);
    const after = await checkIn(user, id).expect(409);
    expect(after.body.code).toBe('TRIP_NOT_ACTIVE');
  });

  it('sos 200 texts the contact and returns the rescue number; again at once 429', async () => {
    const { user, id } = await startTrip();
    texts.length = 0;
    const res = await request(server())
      .post(`/v1/trips/${id}/sos`)
      .set(...bearer(user.accessToken))
      .send({ lat: 41.4, lng: 69.4, accuracyM: 15 })
      .expect(200);
    expect(res.body).toMatchObject({
      contactName: 'guest_2',
      sosCallNumber: SOS_NUMBER,
      sentAt: expect.any(String),
    });
    expect(texts).toHaveLength(1);
    expect(texts[0]?.phone).toBe(CONTACT.phone);
    expect(texts[0]?.text).toContain(
      'https://maps.google.com/?q=41.40000,69.40000',
    );
    expect(texts[0]?.text).toMatch(/\/t\/[A-Za-z0-9_-]{22}/);

    const again = await request(server())
      .post(`/v1/trips/${id}/sos`)
      .set(...bearer(user.accessToken))
      .send({})
      .expect(429);
    expect(again.body.code).toBe('SOS_TOO_SOON');
    expect(again.body.details.retryInSec).toBeGreaterThan(0);

    const trip = await prisma.trip.findUniqueOrThrow({ where: { id } });
    expect(trip.status).toBe('active');
  });

  it('a failed sos (502) starts no cooldown: retry at once is sent', async () => {
    const { user, id } = await startTrip();
    vi.spyOn(app.get(SmsSender), 'sendText').mockRejectedValueOnce(
      new Error('provider down'),
    );
    const failed = await request(server())
      .post(`/v1/trips/${id}/sos`)
      .set(...bearer(user.accessToken))
      .send({})
      .expect(502);
    expect(failed.body.code).toBe('SOS_SEND_FAILED');

    await request(server())
      .post(`/v1/trips/${id}/sos`)
      .set(...bearer(user.accessToken))
      .send({})
      .expect(200);
  });

  it('sos-contact 200 with no-store for the owner; 404 for another user', async () => {
    const { user, id } = await startTrip();
    const res = await request(server())
      .get(`/v1/trips/${id}/sos-contact`)
      .set(...bearer(user.accessToken))
      .expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({
      phone: CONTACT.phone,
      sosCallNumber: SOS_NUMBER,
    });

    const other = await signUp(app);
    const denied = await request(server())
      .get(`/v1/trips/${id}/sos-contact`)
      .set(...bearer(other.accessToken))
      .expect(404);
    expect(denied.body.code).toBe('TRIP_NOT_FOUND');
  });
});

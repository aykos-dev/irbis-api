import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import {
  seedBadgesConfig,
  seedCheckInConfig,
  seedGameConfig,
  seedTripConfig,
} from '../prisma/seed/seed.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { bearer, makeAdmin, signUp, type Account } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const SPOT = { lat: 41.51, lng: 70.01 };
// Synthetic contact.
const CONTACT = { name: 'guest_9', relation: 'friend', phone: '+998900000042' };

describe('trip-events (e2e) - edit/cancel/leave, attendance, cards, search, admin (AC5-AC8)', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let placeId: string;
  let leader: Account;
  let joiner: Account;
  let groupId: string;
  const server = () => app.getHttpServer();
  const auth = (account: Account) => bearer(account.accessToken);

  const body = (overrides: Record<string, unknown> = {}) => {
    const startAt = new Date(Date.now() + 2 * DAY_MS);
    return {
      placeId,
      groupIds: [groupId],
      visibility: 'public',
      startAt: startAt.toISOString(),
      backBy: new Date(startAt.getTime() + 8 * HOUR_MS).toISOString(),
      meetingText: 'Metro Buyuk Ipak Yoli, exit 2',
      ...overrides,
    };
  };

  /** A trip with the joiner approved on it. */
  const tripWithJoiner = async (overrides: Record<string, unknown> = {}) => {
    const created = await request(server())
      .post('/v1/group-trips')
      .set(...auth(leader))
      .send(body(overrides))
      .expect(201);
    const id = created.body.id as string;
    await request(server())
      .post(`/v1/group-trips/${id}/requests`)
      .set(...auth(joiner))
      .send({ contact: CONTACT })
      .expect(201);
    await request(server())
      .post(`/v1/group-trips/${id}/requests/${joiner.id}/approve`)
      .set(...auth(leader))
      .expect(201);
    return id;
  };

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    await seedGameConfig(prisma);
    await seedTripConfig(prisma);
    await seedCheckInConfig(prisma);
    await seedBadgesConfig(prisma);
    const place = await prisma.place.create({
      data: {
        slug: 'tm-peak',
        nameUz: 'Katta Chimyon',
        nameEn: 'Big Chimgan',
        type: 'peak',
        latitude: SPOT.lat,
        longitude: SPOT.lng,
        elevationM: 2000,
        difficulty: 2,
        requiredLevel: 1,
      },
    });
    placeId = place.id;
    leader = await signUp(app);
    joiner = await signUp(app);
    const group = await request(server())
      .post('/v1/groups')
      .set(...auth(leader))
      .send({
        name: 'Ridge Walkers',
        description: 'Walks',
        visibility: 'public',
      })
      .expect(201);
    groupId = group.body.id as string;
    await request(server())
      .post(`/v1/groups/${groupId}/join`)
      .set(...auth(joiner))
      .expect(201);
    await request(server())
      .put('/v1/me/emergency-contact')
      .set(...auth(leader))
      .send(CONTACT)
      .expect(200);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('AC5 edit: moves planned Trips and notifies; 422 below approved; 409 once the day starts', async () => {
    const id = await tripWithJoiner();
    const startAt = new Date(Date.now() + 3 * DAY_MS);
    const backBy = new Date(startAt.getTime() + 6 * HOUR_MS);
    const edited = await request(server())
      .patch(`/v1/group-trips/${id}`)
      .set(...auth(leader))
      .send({ startAt: startAt.toISOString(), backBy: backBy.toISOString() })
      .expect(200);
    expect(edited.body.startAt).toBe(startAt.toISOString());
    const planned = await prisma.trip.findMany({
      where: { groupTripId: id, status: 'planned' },
      select: { startAt: true, backBy: true },
    });
    expect(planned).toHaveLength(2);
    expect(
      planned.every((t) => t.startAt.getTime() === startAt.getTime()),
    ).toBe(true);
    expect(
      await prisma.notification.count({
        where: { userId: joiner.id, kind: 'trip_changed' },
      }),
    ).toBe(1);

    await request(server())
      .patch(`/v1/group-trips/${id}`)
      .set(...auth(joiner))
      .send({ meetingText: 'x' })
      .expect(403)
      .expect(({ body: err }) => expect(err.code).toBe('TRIP_LEADER_REQUIRED'));
    await prisma.groupTripMember.create({
      data: {
        tripId: id,
        userId: (await signUp(app)).id,
        role: 'member',
        status: 'approved',
      },
    });
    await request(server())
      .patch(`/v1/group-trips/${id}`)
      .set(...auth(leader))
      .send({ maxPeople: 2 })
      .expect(422)
      .expect(({ body: err }) =>
        expect(err.fieldErrors).toEqual({ maxPeople: ['belowApproved'] }),
      );

    await prisma.groupTrip.update({
      where: { id },
      data: {
        // Started yesterday, so a check-in today does not count it (AC7 below).
        startAt: new Date(Date.now() - DAY_MS - HOUR_MS),
        backBy: new Date(Date.now() + HOUR_MS),
      },
    });
    await request(server())
      .patch(`/v1/group-trips/${id}`)
      .set(...auth(leader))
      .send({ meetingText: 'Bus stop' })
      .expect(409)
      .expect(({ body: err }) => expect(err.code).toBe('GROUP_TRIP_LOCKED'));
  });

  it('AC5 cancel deletes planned Trips; leave: leader 409, a member leaves', async () => {
    const id = await tripWithJoiner();
    const other = await tripWithJoiner();
    await request(server())
      .post(`/v1/group-trips/${other}/leave`)
      .set(...auth(leader))
      .expect(409)
      .expect(({ body: err }) => expect(err.code).toBe('LEADER_CANNOT_LEAVE'));
    const left = await request(server())
      .post(`/v1/group-trips/${other}/leave`)
      .set(...auth(joiner))
      .expect(201);
    expect(left.body).toMatchObject({ approvedCount: 1, me: null });
    expect(
      await prisma.trip.count({
        where: { groupTripId: other, userId: joiner.id },
      }),
    ).toBe(0);

    const cancelled = await request(server())
      .post(`/v1/group-trips/${id}/cancel`)
      .set(...auth(leader))
      .expect(201);
    expect(cancelled.body.status).toBe('cancelled');
    expect(await prisma.trip.count({ where: { groupTripId: id } })).toBe(0);
    expect(
      await prisma.notification.count({
        where: { userId: joiner.id, kind: 'trip_cancelled' },
      }),
    ).toBe(1);
    await request(server())
      .post(`/v1/group-trips/${id}/cancel`)
      .set(...auth(leader))
      .expect(409)
      .expect(({ body: err }) => expect(err.code).toBe('GROUP_TRIP_CLOSED'));
  });

  it('AC6: trip-preview merges the group gear; the planned TripDto carries groupTripId + groupGear', async () => {
    const id = await tripWithJoiner({
      gearKeys: ['headlamp', 'water'],
      customGear: ['Crampons'],
    });
    const startAt = new Date(Date.now() + 2 * DAY_MS);
    const preview = await request(server())
      .get(`/v1/places/${placeId}/trip-preview`)
      .query({
        startAt: startAt.toISOString(),
        backBy: new Date(startAt.getTime() + 2 * HOUR_MS).toISOString(),
        groupTripId: id,
      })
      .set(...auth(joiner))
      .expect(200);
    const keys = (preview.body.gear as { key: string }[]).map((g) => g.key);
    expect(keys.filter((k) => k === 'water')).toHaveLength(1);
    expect(keys).toContain('headlamp');
    expect(preview.body.gear).toContainEqual({
      key: 'custom-1',
      label: 'Crampons',
      custom: true,
    });

    const current = await request(server())
      .get('/v1/trips/current')
      .set(...auth(joiner))
      .expect(200);
    expect(current.body.planned).toContainEqual(
      expect.objectContaining({
        groupTripId: id,
        groupGear: { keys: ['headlamp', 'water'], custom: ['Crampons'] },
      }),
    );
  });

  it('AC7: a check-in on the trip day marks attendance and Trail Buddy progress; another day does not', async () => {
    const today = await tripWithJoiner();
    const later = await tripWithJoiner();
    const now = new Date();
    await prisma.groupTrip.update({
      where: { id: today },
      data: { startAt: now, backBy: new Date(now.getTime() + 4 * HOUR_MS) },
    });
    await request(server())
      .post('/v1/check-ins')
      .set(...auth(joiner))
      .send({
        clientId: randomUUID(),
        placeId,
        lat: SPOT.lat,
        lng: SPOT.lng,
        accuracyM: 10,
        recordedAt: now.toISOString(),
      })
      .expect(201);
    const rows = await prisma.groupTripMember.findMany({
      where: { userId: joiner.id, tripId: { in: [today, later] } },
      select: { tripId: true, attendedAt: true },
    });
    expect(rows.find((r) => r.tripId === today)?.attendedAt).not.toBeNull();
    expect(rows.find((r) => r.tripId === later)?.attendedAt).toBeNull();

    const badges = await request(server())
      .get('/v1/badges')
      .set(...auth(joiner))
      .expect(200);
    const buddy = (
      badges.body.items as { key: string; progress: number }[]
    ).find((b) => b.key === 'social-trail-buddy');
    expect(buddy?.progress).toBe(1);
  });

  it('AC8: a live chat card in the viewer locale, trips search, admin list and audited cancel', async () => {
    await prisma.user.update({
      where: { id: joiner.id },
      data: { locale: 'en' },
    });
    const id = await tripWithJoiner({ description: 'Sunrise ridge walk' });
    const chat = await request(server())
      .get(`/v1/groups/${groupId}/messages`)
      .set(...auth(joiner))
      .expect(200);
    const card = (
      chat.body.items as {
        kind: string;
        trip: { groupTripId: string | null } | null;
      }[]
    ).find((m) => m.trip?.groupTripId === id);
    expect(card).toMatchObject({
      kind: 'trip',
      trip: { title: 'Big Chimgan', joined: 2, capacity: 0, requiredLevel: 1 },
    });

    const found = await request(server())
      .get('/v1/search')
      .query({ q: 'sunrise ridge', scope: 'trips' })
      .set(...auth(joiner))
      .expect(200);
    expect(found.body.trips).toEqual([
      expect.objectContaining({
        id,
        placeName: 'Big Chimgan',
        approvedCount: 2,
      }),
    ]);

    const admin = await makeAdmin(app);
    await request(server())
      .get('/v1/admin/group-trips')
      .set(...auth(joiner))
      .expect(403);
    const list = await request(server())
      .get('/v1/admin/group-trips?status=open')
      .set(...auth(admin))
      .expect(200);
    expect(list.body.items).toContainEqual(
      expect.objectContaining({
        id,
        leaderUsername: leader.username,
        status: 'open',
      }),
    );
    const cancelled = await request(server())
      .post(`/v1/admin/group-trips/${id}/cancel`)
      .set(...auth(admin))
      .send({ note: 'Avalanche warning' })
      .expect(201);
    expect(cancelled.body.status).toBe('cancelled');
    expect(await prisma.trip.count({ where: { groupTripId: id } })).toBe(0);
    expect(
      await prisma.adminAuditLog.count({
        where: { adminId: admin.id, action: 'cancel_group_trip', detail: id },
      }),
    ).toBe(1);
  });
});

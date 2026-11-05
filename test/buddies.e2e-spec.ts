import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import {
  seedBadgesConfig,
  seedCheckInConfig,
  seedGameConfig,
  seedTripConfig,
} from '../prisma/seed/seed.js';
import { TripEventsService } from '../src/features/trip-events/trip-events.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { bearer, signUp, type Account } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const SCORE = { reliable: 5, safety: 4, company: 5 };
const userIds = (list: unknown): string[] =>
  (list as { userId: string }[]).map((item) => item.userId);

describe('buddies (e2e) - find, links, availability, buddies trips, ratings (AC1-AC8)', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let placeId: string;
  const server = () => app.getHttpServer();
  const auth = (account: Account) => bearer(account.accessToken);

  /** A group trip led by `leader` with the others approved; `attended` get attendedAt. */
  const groupTrip = async (
    leader: Account,
    members: Account[],
    options: {
      startAt?: Date;
      backBy?: Date;
      attended?: Account[];
      visibility?: 'public' | 'private';
    } = {},
  ) => {
    const startAt = options.startAt ?? new Date(Date.now() + 2 * DAY_MS);
    const attended = new Set((options.attended ?? []).map((a) => a.id));
    const trip = await prisma.groupTrip.create({
      data: {
        creatorId: leader.id,
        placeId,
        visibility: options.visibility ?? 'public',
        startAt,
        backBy: options.backBy ?? new Date(startAt.getTime() + 6 * HOUR_MS),
        meetingText: 'Metro exit 2',
        description: '',
        members: {
          create: [leader, ...members].map((account, index) => ({
            userId: account.id,
            role: index === 0 ? 'leader' : 'member',
            status: 'approved',
            attendedAt: attended.has(account.id) ? startAt : null,
          })),
        },
      },
    });
    return trip.id;
  };

  const befriend = async (a: Account, b: Account) => {
    const sent = await request(server())
      .post('/v1/buddies/requests')
      .set(...auth(a))
      .send({ userId: b.id })
      .expect(201);
    await request(server())
      .post(`/v1/buddies/requests/${sent.body.id as string}/accept`)
      .set(...auth(b))
      .expect(200);
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
        slug: 'bd-peak',
        nameUz: 'Katta Chimyon',
        nameEn: 'Big Chimgan',
        type: 'peak',
        latitude: 41.51,
        longitude: 70.01,
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

  it('AC1/AC2/AC3: find lists only active findable people; weekend and region filters; availability', async () => {
    const viewer = await signUp(app);
    const shown = { homeRegion: 'khorezm' as const, showHomeRegion: true };
    const [free, busy, demo, hidden, inactive, linked] = await Promise.all(
      Array.from({ length: 6 }, () => signUp(app)),
    );
    await prisma.user.updateMany({
      where: {
        id: {
          in: [free, busy, demo, hidden, inactive, linked].map((a) => a.id),
        },
      },
      data: shown,
    });
    await prisma.user.update({
      where: { id: demo.id },
      data: { isDemo: true },
    });
    await prisma.user.update({
      where: { id: hidden.id },
      data: { findBuddies: false },
    });
    await prisma.user.update({
      where: { id: inactive.id },
      data: { lastActiveAt: new Date(Date.now() - 40 * DAY_MS) },
    });
    await request(server())
      .post('/v1/buddies/requests')
      .set(...auth(viewer))
      .send({ userId: linked.id })
      .expect(201);

    const fresh = await request(server())
      .get('/v1/me/availability')
      .set(...auth(free))
      .expect(200);
    expect(fresh.body).toMatchObject({ sat: false, sun: false });
    const put = await request(server())
      .put('/v1/me/availability')
      .set(...auth(free))
      .send({ sat: false, sun: true })
      .expect(200);
    expect(put.body).toEqual({
      weekStart: fresh.body.weekStart,
      sat: false,
      sun: true,
    });

    const all = await request(server())
      .get('/v1/buddies/find?region=khorezm')
      .set(...auth(viewer))
      .expect(200);
    expect(all.body.matchCount).toBe(2);
    expect(userIds(all.body.items)).toEqual([free.id, busy.id]);
    expect(all.body.items[0]).toMatchObject({
      region: 'khorezm',
      free: { sat: false, sun: true },
      rating: null,
      tripsTogether: 0,
      verifiedLeader: false,
    });
    expect(all.body.nextCursor).toBeNull();

    const weekend = await request(server())
      .get('/v1/buddies/find?region=khorezm&weekend=true&level=near')
      .set(...auth(viewer))
      .expect(200);
    expect(userIds(weekend.body.items)).toEqual([free.id]);

    await request(server())
      .get('/v1/buddies/find?level=everyone')
      .set(...auth(viewer))
      .expect(400);
  });

  it('AC4/AC5: request, reverse auto-accept, list, decline and remove; demo 403, 404, 409', async () => {
    const [a, b, c] = await Promise.all([
      signUp(app),
      signUp(app),
      signUp(app),
    ]);
    const sent = await request(server())
      .post('/v1/buddies/requests')
      .set(...auth(a))
      .send({ userId: b.id })
      .expect(201);
    expect(sent.body).toMatchObject({ status: 'pending', userId: b.id });
    expect(
      await prisma.notification.count({
        where: { userId: b.id, kind: 'buddy_request', category: 'social' },
      }),
    ).toBe(1);
    await request(server())
      .post('/v1/buddies/requests')
      .set(...auth(a))
      .send({ userId: b.id })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('BUDDY_EXISTS'));

    const lists = await request(server())
      .get('/v1/buddies')
      .set(...auth(b))
      .expect(200);
    expect(lists.body.incoming).toEqual([
      expect.objectContaining({ id: sent.body.id, userId: a.id }),
    ]);

    const reverse = await request(server())
      .post('/v1/buddies/requests')
      .set(...auth(b))
      .send({ userId: a.id })
      .expect(200);
    expect(reverse.body).toMatchObject({
      id: sent.body.id,
      status: 'accepted',
      userId: a.id,
    });
    expect(
      await prisma.notification.count({
        where: { userId: a.id, kind: 'buddy_accepted' },
      }),
    ).toBe(1);
    const mine = await request(server())
      .get('/v1/buddies')
      .set(...auth(a))
      .expect(200);
    expect(userIds(mine.body.buddies)).toEqual([b.id]);

    const toC = await request(server())
      .post('/v1/buddies/requests')
      .set(...auth(a))
      .send({ userId: c.id })
      .expect(201);
    await request(server())
      .post(`/v1/buddies/requests/${toC.body.id as string}/decline`)
      .set(...auth(a))
      .expect(404);
    await request(server())
      .post(`/v1/buddies/requests/${toC.body.id as string}/decline`)
      .set(...auth(c))
      .expect(204);
    await request(server())
      .delete(`/v1/buddies/${a.id}`)
      .set(...auth(b))
      .expect(204);
    await request(server())
      .delete(`/v1/buddies/${b.id}`)
      .set(...auth(a))
      .expect(404);

    await prisma.user.update({ where: { id: c.id }, data: { isDemo: true } });
    await request(server())
      .post('/v1/buddies/requests')
      .set(...auth(c))
      .send({ userId: a.id })
      .expect(403)
      .expect((res) => expect(res.body.code).toBe('SECURED_ACCOUNT_REQUIRED'));
    await request(server())
      .post('/v1/buddies/requests')
      .set(...auth(a))
      .send({ userId: c.id })
      .expect(404);
  });

  it("AC6: buddies' upcoming public trips only", async () => {
    const [me, buddy, stranger] = await Promise.all([
      signUp(app),
      signUp(app),
      signUp(app),
    ]);
    await befriend(me, buddy);
    const going = await groupTrip(stranger, [buddy]);
    await groupTrip(stranger, [buddy], { visibility: 'private' });
    await groupTrip(stranger, [buddy], {
      startAt: new Date(Date.now() - DAY_MS),
    });
    await groupTrip(buddy, [stranger], {
      startAt: new Date(Date.now() + 3 * DAY_MS),
    });
    await groupTrip(stranger, []);

    const res = await request(server())
      .get('/v1/buddies/trips')
      .set(...auth(me))
      .expect(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0]).toMatchObject({
      id: going,
      placeName: {
        uz: 'Katta Chimyon',
        ru: 'Katta Chimyon',
        en: 'Big Chimgan',
      },
      approvedCount: 2,
      buddies: [
        { userId: buddy.id, username: buddy.username, displayName: null },
      ],
    });
  });

  it('AC7: trip_rate on attendance; attendees rate each other; 403 non-attendee, 409 after 7 days', async () => {
    const [leader, a, b, outsider] = await Promise.all([
      signUp(app),
      signUp(app),
      signUp(app),
      signUp(app),
    ]);
    const now = new Date();
    const trip = await groupTrip(leader, [a, b, outsider], {
      startAt: now,
      backBy: new Date(now.getTime() + 4 * HOUR_MS),
      attended: [leader, b],
    });
    const attendance = app.get(TripEventsService);
    await attendance.recordAttendance(a.id, placeId, now);
    await attendance.recordAttendance(a.id, placeId, now);
    expect(
      await prisma.notification.findMany({
        where: { userId: a.id, kind: 'trip_rate' },
        select: { category: true, data: true },
      }),
    ).toEqual([{ category: 'trips', data: { groupTripId: trip } }]);

    const pending = await request(server())
      .get(`/v1/group-trips/${trip}/ratings/pending`)
      .set(...auth(a))
      .expect(200);
    expect(userIds(pending.body.attendees).sort()).toEqual(
      [leader.id, b.id].sort(),
    );
    expect(pending.body.attendees[0].myScores).toBeNull();
    const home = await request(server())
      .get('/v1/me/ratings/pending')
      .set(...auth(a))
      .expect(200);
    expect(home.body.items).toEqual([
      expect.objectContaining({ groupTripId: trip, unrated: 2 }),
    ]);

    await request(server())
      .put(`/v1/group-trips/${trip}/ratings/${b.id}`)
      .set(...auth(a))
      .send(SCORE)
      .expect(204);
    await request(server())
      .put(`/v1/group-trips/${trip}/ratings/${b.id}`)
      .set(...auth(a))
      .send({ ...SCORE, company: 3 })
      .expect(204);
    expect(
      await prisma.tripRating.count({
        where: { groupTripId: trip, rateeId: b.id },
      }),
    ).toBe(1);
    await request(server())
      .put(`/v1/group-trips/${trip}/ratings/${b.id}`)
      .set(...auth(outsider))
      .send(SCORE)
      .expect(403)
      .expect((res) => expect(res.body.code).toBe('NOT_ATTENDEE'));
    await request(server())
      .put(`/v1/group-trips/${trip}/ratings/${a.id}`)
      .set(...auth(a))
      .send(SCORE)
      .expect(422);
    await request(server())
      .put(`/v1/group-trips/${trip}/ratings/${b.id}`)
      .set(...auth(a))
      .send({ ...SCORE, safety: 6 })
      .expect(400);

    await prisma.groupTrip.update({
      where: { id: trip },
      data: { backBy: new Date(now.getTime() - 8 * DAY_MS) },
    });
    await request(server())
      .put(`/v1/group-trips/${trip}/ratings/${leader.id}`)
      .set(...auth(a))
      .send(SCORE)
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('RATING_CLOSED'));
    const closed = await request(server())
      .get('/v1/me/ratings/pending')
      .set(...auth(a))
      .expect(200);
    expect(closed.body.items).toEqual([]);
  });
});

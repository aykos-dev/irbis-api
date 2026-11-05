import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { seedTripConfig } from '../prisma/seed/seed.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { bearer, signUp, type Account } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
// Synthetic contact.
const CONTACT = { name: 'guest_9', relation: 'friend', phone: '+998900000042' };

describe('trip-events (e2e) - group trips AC1-AC4', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let placeId: string;
  let leader: Account;
  let joiner: Account;
  let outsider: Account;
  let leaderGroupId: string;
  let outsiderGroupId: string;
  const server = () => app.getHttpServer();
  const auth = (account: Account) => bearer(account.accessToken);

  const body = (overrides: Record<string, unknown> = {}) => {
    const startAt = new Date(Date.now() + 2 * DAY_MS);
    return {
      placeId,
      groupIds: [leaderGroupId],
      visibility: 'public',
      startAt: startAt.toISOString(),
      backBy: new Date(startAt.getTime() + 8 * HOUR_MS).toISOString(),
      meetingText: 'Metro Buyuk Ipak Yoli, exit 2',
      ...overrides,
    };
  };
  const createGroup = async (owner: Account, name: string) => {
    const res = await request(server())
      .post('/v1/groups')
      .set(...auth(owner))
      .send({ name, description: 'Weekend walks', visibility: 'public' })
      .expect(201);
    return res.body.id as string;
  };

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    await seedTripConfig(prisma);
    const place = await prisma.place.create({
      data: {
        slug: 'te-peak',
        nameUz: 'te-peak',
        type: 'peak',
        latitude: 41.5,
        longitude: 70.0,
        elevationM: 2000,
        difficulty: 2,
        requiredLevel: 1,
      },
    });
    placeId = place.id;
    leader = await signUp(app);
    joiner = await signUp(app);
    outsider = await signUp(app);
    leaderGroupId = await createGroup(leader, 'Trip Leaders Club');
    outsiderGroupId = await createGroup(outsider, 'Other Hikers Club');
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

  it('AC1: 403 for a non-admin and for a foreign group, 422 for 61 days ahead', async () => {
    await request(server())
      .post('/v1/group-trips')
      .set(...auth(joiner))
      .send(body({ groupIds: [] }))
      .expect(403)
      .expect(({ body: err }) => expect(err.code).toBe('TRIP_LEADER_REQUIRED'));
    await request(server())
      .post('/v1/group-trips')
      .set(...auth(leader))
      .send(body({ groupIds: [leaderGroupId, outsiderGroupId] }))
      .expect(403)
      .expect(({ body: err }) => expect(err.code).toBe('GROUP_LINK_FORBIDDEN'));
    const far = new Date(Date.now() + 61 * DAY_MS);
    await request(server())
      .post('/v1/group-trips')
      .set(...auth(leader))
      .send(
        body({
          startAt: far.toISOString(),
          backBy: new Date(far.getTime() + HOUR_MS).toISOString(),
        }),
      )
      .expect(422)
      .expect(({ body: err }) => {
        expect(err.code).toBe('GROUP_TRIP_INVALID');
        expect(err.fieldErrors).toEqual({ startAt: ['tooFarAhead'] });
      });
  });

  it('AC2: a private trip is 404 to outsiders and visible to linked-group members', async () => {
    const created = await request(server())
      .post('/v1/group-trips')
      .set(...auth(leader))
      .send(body({ visibility: 'private' }))
      .expect(201);
    const id = created.body.id as string;
    expect(created.body).toMatchObject({
      visibility: 'private',
      approvedCount: 1,
      me: { role: 'leader', status: 'approved' },
      groups: [{ id: leaderGroupId, name: 'Trip Leaders Club' }],
    });
    await request(server()).get(`/v1/group-trips/${id}`).expect(404);
    await request(server())
      .get(`/v1/group-trips/${id}`)
      .set(...auth(outsider))
      .expect(404)
      .expect(({ body: err }) => expect(err.code).toBe('GROUP_TRIP_NOT_FOUND'));

    await request(server())
      .post(`/v1/groups/${leaderGroupId}/join`)
      .set(...auth(joiner))
      .expect(201);
    await request(server())
      .get(`/v1/group-trips/${id}`)
      .set(...auth(joiner))
      .expect(200);
    const upcoming = await request(server())
      .get(`/v1/group-trips?groupId=${leaderGroupId}`)
      .set(...auth(joiner))
      .expect(200);
    const items = (upcoming.body as { items: { id: string }[] }).items;
    expect(items.map((t) => t.id)).toContain(id);
  });

  it('AC3 + AC4: demo 403; request, approve creates a planned Trip; then full 409', async () => {
    const created = await request(server())
      .post('/v1/group-trips')
      .set(...auth(leader))
      .send(body({ maxPeople: 2 }))
      .expect(201);
    const id = created.body.id as string;

    const demo = await signUp(app);
    await prisma.user.update({
      where: { id: demo.id },
      data: { isDemo: true },
    });
    await request(server())
      .post(`/v1/group-trips/${id}/requests`)
      .set(...auth(demo))
      .send({})
      .expect(403)
      .expect(({ body: err }) =>
        expect(err.code).toBe('SECURED_ACCOUNT_REQUIRED'),
      );

    await request(server())
      .post(`/v1/group-trips/${id}/requests`)
      .set(...auth(joiner))
      .send({ note: '  first time here  ', contact: CONTACT })
      .expect(201);
    const leaderView = await request(server())
      .get(`/v1/group-trips/${id}`)
      .set(...auth(leader))
      .expect(200);
    expect(leaderView.body.requests).toEqual([
      expect.objectContaining({ userId: joiner.id, note: 'first time here' }),
    ]);
    await request(server())
      .post(`/v1/group-trips/${id}/requests/${joiner.id}/approve`)
      .set(...auth(outsider))
      .expect(403)
      .expect(({ body: err }) => expect(err.code).toBe('TRIP_LEADER_REQUIRED'));

    const approved = await request(server())
      .post(`/v1/group-trips/${id}/requests/${joiner.id}/approve`)
      .set(...auth(leader))
      .expect(201);
    expect(approved.body).toMatchObject({ approvedCount: 2, spotsLeft: 0 });
    const personal = await prisma.trip.findFirstOrThrow({
      where: { userId: joiner.id, groupTripId: id },
    });
    expect(personal).toMatchObject({ status: 'planned', alertEnabled: true });
    const notices = await prisma.notification.findMany({
      where: { kind: { in: ['trip_request', 'trip_approved'] } },
      select: { userId: true, kind: true },
    });
    expect(notices).toEqual(
      expect.arrayContaining([
        { userId: leader.id, kind: 'trip_request' },
        { userId: joiner.id, kind: 'trip_approved' },
      ]),
    );

    await request(server())
      .put('/v1/me/emergency-contact')
      .set(...auth(outsider))
      .send(CONTACT)
      .expect(200);
    await request(server())
      .post(`/v1/group-trips/${id}/requests`)
      .set(...auth(outsider))
      .send({})
      .expect(409)
      .expect(({ body: err }) => expect(err.code).toBe('GROUP_TRIP_FULL'));
  });
});

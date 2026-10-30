import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { bearer, signUp, type Account } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const ZERO = { peaks: 0, lakes: 0, caves: 0, walkedM: 0, climbedM: 0, spots: 0 };

describe('profile stats (e2e) - all-time, privacy-aware', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let placeId: string;
  const server = () => app.getHttpServer();

  const meStats = (user: Account) =>
    request(server()).get('/v1/me/stats').set(...bearer(user.accessToken));
  const publicStats = (username: string) =>
    request(server()).get(`/v1/users/${username}/stats`);

  async function visit(user: Account, place: string, month: string): Promise<void> {
    await prisma.checkIn.create({
      data: {
        userId: user.id,
        placeId: place,
        clientId: randomUUID(),
        lat: 41.31,
        lng: 69.28,
        accuracyM: 10,
        recordedAt: new Date(`${month}-15T08:00:00.000Z`),
        month,
        counted: true,
      },
    });
  }

  async function place(slug: string, type: 'peak' | 'lake' | 'cave'): Promise<string> {
    const created = await prisma.place.create({
      data: {
        slug,
        nameUz: slug,
        nameEn: slug,
        type,
        latitude: 41.31,
        longitude: 69.28,
        elevationM: 2000,
        difficulty: 1,
        requiredLevel: 1,
      },
    });
    return created.id;
  }

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    placeId = await place('stats-peak', 'peak');
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('a fresh account gets honest zeros', async () => {
    const user = await signUp(app);
    const res = await meStats(user).expect(200);
    expect(res.body).toEqual(ZERO);
  });

  it('counts distinct visited places by type and checked-out trip totals', async () => {
    const user = await signUp(app);
    const lake = await place('stats-lake', 'lake');
    const cave = await place('stats-cave', 'cave');
    await visit(user, placeId, '2026-10');
    await visit(user, placeId, '2026-11'); // The same peak again is not a new peak.
    await visit(user, lake, '2026-10');
    await visit(user, cave, '2026-10');
    const common = {
      userId: user.id,
      placeId,
      status: 'checked_out' as const,
      startAt: new Date('2026-10-20T05:00:00.000Z'),
      backBy: new Date('2026-10-20T15:00:00.000Z'),
      alertEnabled: false,
      contactName: 'Contact',
      contactRelation: 'Friend',
      contactPhone: 'encrypted',
      contactPhoneLast2: '99',
    };
    await prisma.trip.create({
      data: {
        ...common,
        distanceM: 12_500,
        climbM: 800,
        checkedOutAt: new Date('2026-10-20T14:00:00.000Z'),
      },
    });
    await prisma.trip.create({
      data: {
        ...common,
        distanceM: 99_999,
        climbM: 9_999,
        status: 'active',
        checkedOutAt: null,
      },
    });

    const res = await meStats(user).expect(200);
    expect(res.body).toEqual({
      peaks: 1,
      lakes: 1,
      caves: 1,
      walkedM: 12_500,
      climbedM: 800,
      spots: 0,
    });
  });

  it('shows public stats by username and hides them when showStats is off', async () => {
    const user = await signUp(app);
    await visit(user, placeId, '2026-10');

    const visible = await publicStats(user.username).expect(200);
    expect(visible.body).toMatchObject({ peaks: 1, lakes: 0, caves: 0 });

    await prisma.user.update({
      where: { id: user.id },
      data: { showStats: false },
    });
    const hidden = await publicStats(user.username).expect(200);
    expect(hidden.body).toEqual(ZERO);
  });

  it('answers 404 for private, deleted and unknown profiles', async () => {
    const user = await signUp(app);
    await prisma.user.update({
      where: { id: user.id },
      data: { publicProfile: false },
    });
    await publicStats(user.username)
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe('PROFILE_NOT_FOUND'));

    await prisma.user.update({
      where: { id: user.id },
      data: { publicProfile: true, deletedAt: new Date() },
    });
    await publicStats(user.username).expect(404);
    await publicStats('nobody_here').expect(404);
  });

  it('requires authentication for the signed-in stats', async () => {
    await request(server()).get('/v1/me/stats').expect(401);
  });
});

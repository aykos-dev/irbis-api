import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { type Account, bearer, signUp } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

interface SeedRow {
  category: 'trips' | 'social' | 'rewards';
  kind: string;
  title: Record<string, string>;
  body?: Record<string, string> | null;
  data?: Record<string, string> | null;
  readAt?: Date | null;
  createdAt: string;
}

describe('notifications API (e2e) - AC7', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;

  const server = () => app.getHttpServer();
  const list = (account: Account, query = '') =>
    request(server())
      .get(`/v1/notifications${query}`)
      .set(...bearer(account.accessToken));
  const readAll = (account: Account) =>
    request(server())
      .post('/v1/notifications/read-all')
      .set(...bearer(account.accessToken));

  const seed = async (
    account: Account,
    rows: SeedRow[],
  ): Promise<string[]> => {
    const ids: string[] = [];
    for (const row of rows) {
      const created = await prisma.notification.create({
        data: {
          userId: account.id,
          category: row.category,
          kind: row.kind,
          title: row.title,
          ...(row.body ? { body: row.body } : {}),
          ...(row.data ? { data: row.data } : {}),
          readAt: row.readAt ?? null,
          createdAt: new Date(row.createdAt),
        },
      });
      ids.push(created.id);
    }
    return ids;
  };

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
    await db.stop();
  });

  it('answers an honest empty inbox for a fresh account', async () => {
    const user = await signUp(app, { locale: 'uz' });
    const res = await list(user).expect(200);
    expect(res.body).toEqual({ items: [], nextCursor: null, unreadCount: 0 });
  });

  it('lists newest-first, filters by category, paginates and localizes', async () => {
    const user = await signUp(app, { locale: 'uz' });
    const ids = await seed(user, [
      {
        category: 'trips',
        kind: 'trip_reminder',
        title: { uz: 'Eski safar', en: 'Old trip' },
        body: { uz: 'Eslatma', en: 'Reminder' },
        data: { tripId: 't1' },
        createdAt: '2026-10-19T09:00:00.000Z',
      },
      {
        category: 'social',
        kind: 'friend_joined',
        title: { uz: "Do'st qo'shildi", en: 'Friend joined' },
        createdAt: '2026-10-20T09:00:00.000Z',
      },
      {
        category: 'trips',
        kind: 'trip_reminder',
        title: { uz: 'Yangi safar', en: 'New trip' },
        createdAt: '2026-10-21T09:00:00.000Z',
      },
    ]);

    const all = await list(user).expect(200);
    const allItems = all.body.items as { id: string }[];
    expect(allItems.map((item) => item.id)).toEqual([ids[2], ids[1], ids[0]]);
    expect(all.body.unreadCount).toBe(3);
    expect(all.body.items[0]).toMatchObject({
      category: 'trips',
      kind: 'trip_reminder',
      title: 'Yangi safar',
      body: null,
      data: null,
      readAt: null,
      createdAt: '2026-10-21T09:00:00.000Z',
    });
    expect(all.body.items[2]).toMatchObject({
      title: 'Eski safar',
      body: 'Eslatma',
      data: { tripId: 't1' },
    });

    const trips = await list(user, '?category=trips').expect(200);
    const tripItems = trips.body.items as { id: string }[];
    expect(tripItems.map((item) => item.id)).toEqual([ids[2], ids[0]]);
    expect(trips.body.unreadCount).toBe(3);

    const first = await list(user, '?limit=2').expect(200);
    expect(first.body.items).toHaveLength(2);
    expect(first.body.nextCursor).toEqual(expect.any(String));
    const second = await list(
      user,
      `?limit=2&cursor=${encodeURIComponent(first.body.nextCursor)}`,
    ).expect(200);
    const secondItems = second.body.items as { id: string }[];
    expect(secondItems.map((item) => item.id)).toEqual([ids[0]]);
    expect(second.body.nextCursor).toBeNull();
  });

  it('marks all categories read, returns the count and keeps zero valid', async () => {
    const user = await signUp(app);
    await seed(user, [
      {
        category: 'trips',
        kind: 'trip_reminder',
        title: { en: 'One' },
        createdAt: '2026-10-19T09:00:00.000Z',
      },
      {
        category: 'social',
        kind: 'friend_joined',
        title: { en: 'Two' },
        createdAt: '2026-10-20T09:00:00.000Z',
      },
      {
        category: 'rewards',
        kind: 'badge_earned',
        title: { en: 'Old' },
        readAt: new Date('2026-10-20T12:00:00.000Z'),
        createdAt: '2026-10-18T09:00:00.000Z',
      },
    ]);

    const marked = await readAll(user).expect(200);
    expect(marked.body).toEqual({ updated: 2 });
    const after = await list(user).expect(200);
    expect(after.body.unreadCount).toBe(0);
    const afterItems = after.body.items as { readAt: string | null }[];
    expect(afterItems.every((item) => item.readAt !== null)).toBe(true);

    const again = await readAll(user).expect(200);
    expect(again.body).toEqual({ updated: 0 });
  });

  it("never exposes another user's rows and mark-all only touches the caller", async () => {
    const mine = await signUp(app);
    const other = await signUp(app);
    await seed(mine, [
      {
        category: 'trips',
        kind: 'trip_reminder',
        title: { en: 'Mine' },
        createdAt: '2026-10-21T09:00:00.000Z',
      },
    ]);
    await seed(other, [
      {
        category: 'social',
        kind: 'friend_joined',
        title: { en: 'Theirs' },
        createdAt: '2026-10-21T09:00:00.000Z',
      },
    ]);

    const theirs = await list(other).expect(200);
    expect(theirs.body.items).toHaveLength(1);
    expect(theirs.body.items[0].title).toBe('Theirs');

    await readAll(mine).expect(200);
    expect((await list(mine).expect(200)).body.unreadCount).toBe(0);
    expect((await list(other).expect(200)).body.unreadCount).toBe(1);
  });

  it('answers 400 for bad input, 401 without a token and 403 for a blocked account', async () => {
    const user = await signUp(app);
    const badCursor = await list(user, '?cursor=not-a-cursor').expect(400);
    expect(badCursor.body.code).toBe('VALIDATION_FAILED');
    expect(badCursor.body.fieldErrors).toEqual({ cursor: ['invalid'] });

    const badCategory = await list(user, '?category=news').expect(400);
    expect(badCategory.body.code).toBe('VALIDATION_FAILED');

    const tooBig = await list(user, '?limit=51').expect(400);
    expect(tooBig.body.code).toBe('VALIDATION_FAILED');

    await request(server()).get('/v1/notifications').expect(401);

    await prisma.user.update({
      where: { id: user.id },
      data: { blockedAt: new Date(), blockReasonCode: 'other' },
    });
    const blocked = await list(user).expect(403);
    expect(blocked.body.code).toBe('ACCOUNT_BLOCKED');
  });
});

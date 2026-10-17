import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { AdminBootstrapService } from '../src/features/auth/admin-bootstrap.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import {
  type Account,
  GOOD_PASSWORD,
  bearer,
  makeAdmin,
  resetAttempts,
  signUp,
  uniqueName,
} from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const COOKIE = 'irbis_admin_refresh';

const pluck = (list: unknown, key: string): string[] =>
  (list as Array<Record<string, string>>).map((item) => item[key]);
const sumCounts = (days: unknown): number =>
  (days as Array<{ count: number }>).reduce((sum, d) => sum + d.count, 0);

describe('admin panel API (e2e) - AC12-AC16', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let admin: Account;

  const server = () => app.getHttpServer();
  const as = (account: Account) => bearer(account.accessToken);
  const get = (path: string, who: Account = admin) =>
    request(server())
      .get(path)
      .set(...as(who));
  const send = (
    method: 'post' | 'put',
    path: string,
    body: object,
    who: Account = admin,
  ) =>
    (method === 'post'
      ? request(server()).post(path)
      : request(server()).put(path)
    )
      .set(...as(who))
      .send(body);

  function refreshCookie(res: request.Response): string {
    const header = (
      res.headers['set-cookie'] as unknown as string[] | undefined
    )?.find((c) => c.startsWith(`${COOKIE}=`));
    if (!header) throw new Error('No refresh cookie was set');
    return header;
  }
  const cookieValue = (setCookie: string): string => setCookie.split(';')[0];

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    admin = await makeAdmin(app);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  beforeEach(async () => {
    await resetAttempts(app);
  });

  describe('admin log-in, refresh and sign-out (AC12)', () => {
    const adminLogIn = (username: string, password: string) =>
      request(server())
        .post('/v1/admin/auth/log-in')
        .send({ username, password });

    it('200: access token + me in the body, refresh token only in an httpOnly Secure SameSite=Lax cookie', async () => {
      const res = await adminLogIn(admin.username, admin.password).expect(200);
      expect(res.body).toMatchObject({
        expiresIn: 900,
        me: { id: admin.id, role: 'admin' },
      });
      expect(res.body.refreshToken).toBeUndefined();
      const setCookie = refreshCookie(res);
      expect(setCookie).toMatch(/HttpOnly/i);
      expect(setCookie).toMatch(/Secure/i);
      expect(setCookie).toMatch(/SameSite=Lax/i);
      expect(setCookie).toMatch(/Path=\/v1\/admin\/auth/i);
      expect(JSON.stringify(res.body)).not.toContain(
        cookieValue(setCookie).split('=')[1],
      );
      await get('/v1/admin/stats/users', {
        ...admin,
        accessToken: res.body.accessToken,
      }).expect(200);
    });

    it('403 NOT_ADMIN for a valid non-admin account', async () => {
      const user = await signUp(app);
      const res = await adminLogIn(user.username, user.password).expect(403);
      expect(res.body.code).toBe('NOT_ADMIN');
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('401 INVALID_CREDENTIALS for a wrong password; no admin hint for non-admins with a wrong password', async () => {
      const user = await signUp(app);
      expect(
        (await adminLogIn(admin.username, 'wrong-password').expect(401)).body
          .code,
      ).toBe('INVALID_CREDENTIALS');
      expect(
        (await adminLogIn(user.username, 'wrong-password').expect(401)).body
          .code,
      ).toBe('INVALID_CREDENTIALS');
    });

    it('423 ACCOUNT_LOCKED: the same lockout as the app (shared per username)', async () => {
      const target = await makeAdmin(app);
      for (let i = 0; i < 4; i++)
        await adminLogIn(target.username, 'wrong-password').expect(401);
      expect(
        (await adminLogIn(target.username, 'wrong-password').expect(423)).body
          .code,
      ).toBe('ACCOUNT_LOCKED');
      await request(server())
        .post('/v1/auth/log-in')
        .send({ username: target.username, password: target.password })
        .expect(423);
    });

    it('403 ACCOUNT_BLOCKED for a blocked admin', async () => {
      const target = await makeAdmin(app);
      await prisma.user.update({
        where: { id: target.id },
        data: { blockedAt: new Date(), blockReasonCode: 'other' },
      });
      expect(
        (await adminLogIn(target.username, target.password).expect(403)).body
          .code,
      ).toBe('ACCOUNT_BLOCKED');
    });

    it('400 VALIDATION_FAILED for a missing body', async () => {
      await request(server())
        .post('/v1/admin/auth/log-in')
        .send({})
        .expect(400);
    });

    it('refresh: rotates the cookie and returns a new access token; reuse kills the family', async () => {
      const login = await adminLogIn(admin.username, admin.password).expect(
        200,
      );
      const first = cookieValue(refreshCookie(login));

      const refreshed = await request(server())
        .post('/v1/admin/auth/refresh')
        .set('Cookie', first)
        .expect(200);
      expect(refreshed.body).toMatchObject({ expiresIn: 900 });
      expect(refreshed.body.accessToken).toEqual(expect.any(String));
      const second = cookieValue(refreshCookie(refreshed));
      expect(second).not.toBe(first);

      const reuse = await request(server())
        .post('/v1/admin/auth/refresh')
        .set('Cookie', first)
        .expect(401);
      expect(reuse.body.code).toBe('REFRESH_REUSED');
      expect(
        (
          await request(server())
            .post('/v1/admin/auth/refresh')
            .set('Cookie', second)
            .expect(401)
        ).body.code,
      ).toBe('REFRESH_INVALID');
    });

    it('refresh: 401 REFRESH_INVALID without a cookie, with a junk cookie, or with a non-admin token', async () => {
      expect(
        (await request(server()).post('/v1/admin/auth/refresh').expect(401))
          .body.code,
      ).toBe('REFRESH_INVALID');
      await request(server())
        .post('/v1/admin/auth/refresh')
        .set('Cookie', `${COOKIE}=junk`)
        .expect(401);

      const user = await signUp(app);
      await request(server())
        .post('/v1/admin/auth/refresh')
        .set('Cookie', `${COOKIE}=${user.refreshToken}`)
        .expect(401);
    });

    it('sign-out: 204, clears the cookie, and the token no longer refreshes', async () => {
      const login = await adminLogIn(admin.username, admin.password).expect(
        200,
      );
      const cookie = cookieValue(refreshCookie(login));
      const res = await request(server())
        .post('/v1/admin/auth/sign-out')
        .set('Cookie', cookie)
        .expect(204);
      expect(refreshCookie(res)).toMatch(new RegExp(`${COOKIE}=;`));
      await request(server())
        .post('/v1/admin/auth/refresh')
        .set('Cookie', cookie)
        .expect(401);
      await request(server()).post('/v1/admin/auth/sign-out').expect(401);
    });

    it('every admin route: 401 without a token, 403 FORBIDDEN for a normal user', async () => {
      const user = await signUp(app);
      const id = admin.id;
      const routes: Array<[string, string]> = [
        ['get', '/v1/admin/stats/users'],
        ['get', '/v1/admin/users'],
        ['get', `/v1/admin/users/${id}`],
        ['post', `/v1/admin/users/${id}/block`],
        ['post', `/v1/admin/users/${id}/unblock`],
        ['put', `/v1/admin/users/${id}/password`],
        ['put', `/v1/admin/users/${id}/recovery-phone`],
        ['put', `/v1/admin/users/${id}/role`],
        ['get', `/v1/admin/users/${id}/audit`],
      ];
      for (const [method, path] of routes) {
        const call = (
          request(server()) as unknown as Record<
            string,
            (p: string) => request.Test
          >
        )[method];
        await call(path).expect(401);
        const forbidden = await call(path)
          .set(...as(user))
          .send({})
          .expect(403);
        expect(forbidden.body.code).toBe('FORBIDDEN');
      }
    });

    it('role changes apply to existing access tokens at once (the role is read from the account, not the token)', async () => {
      const promoted = await signUp(app);
      await get('/v1/admin/stats/users', promoted).expect(403);
      await prisma.user.update({
        where: { id: promoted.id },
        data: { role: 'admin' },
      });
      await get('/v1/admin/stats/users', promoted).expect(200);
      await prisma.user.update({
        where: { id: promoted.id },
        data: { role: 'user' },
      });
      await get('/v1/admin/stats/users', promoted).expect(403);
    });
  });

  describe('GET /v1/admin/stats/users (AC13)', () => {
    it('200: aggregates only, 30 zero-filled days oldest first', async () => {
      const before = (await get('/v1/admin/stats/users').expect(200)).body;
      const user = await signUp(app);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          recoveryPhone: 'ciphertext',
          recoveryPhoneVerifiedAt: new Date(),
        },
      });
      const after = (await get('/v1/admin/stats/users').expect(200)).body;

      expect(after.total).toBe(before.total + 1);
      expect(after.newToday).toBe(before.newToday + 1);
      expect(after.new7d).toBe(before.new7d + 1);
      expect(after.active7d).toBe(before.active7d + 1);
      expect(after.blocked).toBe(before.blocked);
      expect(after.withPhonePct).toBeGreaterThan(0);
      expect(after.withPhonePct).toBeLessThanOrEqual(100);

      expect(after.signupsByDay).toHaveLength(30);
      const dates = pluck(after.signupsByDay, 'date');
      expect([...dates].sort()).toEqual(dates);
      expect(dates[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const signups = sumCounts(after.signupsByDay);
      expect(signups).toBe(after.new7d + (after.total - after.new7d));
      expect(JSON.stringify(after)).not.toMatch(/username|passwordHash/);
    });

    it('counts a user from 40 days ago in total but not in the 30-day chart', async () => {
      const old = await signUp(app);
      const before = (await get('/v1/admin/stats/users').expect(200)).body;
      await prisma.user.update({
        where: { id: old.id },
        data: { createdAt: new Date(Date.now() - 40 * 86_400_000) },
      });
      const after = (await get('/v1/admin/stats/users').expect(200)).body;
      expect(after.total).toBe(before.total);
      expect(after.newToday).toBe(before.newToday - 1);
      const chartBefore = sumCounts(before.signupsByDay);
      const chartAfter = sumCounts(after.signupsByDay);
      expect(chartAfter).toBe(chartBefore - 1);
    });
  });

  describe('GET /v1/admin/users (AC14)', () => {
    const tag = uniqueName('lst').slice(0, 8);
    const names = Array.from({ length: 5 }, (_, i) => `${tag}_${i}`);
    const users: Account[] = [];

    beforeAll(async () => {
      for (const username of names) users.push(await signUp(app, { username }));
      const base = Date.now();
      for (const [i, user] of users.entries()) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            createdAt: new Date(base - i * 60_000),
            lastActiveAt: new Date(base - (4 - i) * 60_000),
          },
        });
      }
    });

    const list = (query: Record<string, string | number> = {}) =>
      request(server())
        .get('/v1/admin/users')
        .set(...as(admin))
        .query({ q: tag, ...query });

    it('200: search by username, total, no secrets, phone masked', async () => {
      await send('put', `/v1/admin/users/${users[0].id}/recovery-phone`, {
        phone: '+998 90 000 00 67',
        note: 'support call',
      }).expect(200);
      const res = await list().expect(200);
      expect(res.body.total).toBe(5);
      expect(res.body.items).toHaveLength(5);
      expect(res.body.nextCursor).toBeNull();
      const withPhone =
        (res.body.items as Array<Record<string, unknown>>).find(
          (i) => i.id === users[0].id,
        ) ?? {};
      expect(withPhone.recoveryPhoneMasked).toBe('+998 •• ••• •• 67');
      expect(Object.keys(withPhone).sort()).toEqual(
        [
          'id',
          'joinedAt',
          'lastActiveAt',
          'recoveryPhoneMasked',
          'role',
          'status',
          'username',
        ].sort(),
      );
      expect(JSON.stringify(res.body)).not.toMatch(
        /passwordHash|900000067|recoveryPhone"/,
      );
    });

    it('search is a case-insensitive substring match and does not treat _ or % as wildcards', async () => {
      expect(
        (await list({ q: tag.toUpperCase() }).expect(200)).body.total,
      ).toBe(5);
      expect((await list({ q: `${tag}_3` }).expect(200)).body.total).toBe(1);
      expect((await list({ q: `${tag}%` }).expect(200)).body.total).toBe(0);
      expect(
        (await list({ q: `${tag.slice(0, 2)}_` }).expect(200)).body.total,
      ).toBe(0);
    });

    it('sorts by joined (default newest first) and by last active, both directions', async () => {
      const ids = (res: request.Response) => pluck(res.body.items, 'username');
      expect(ids(await list().expect(200))).toEqual(names);
      expect(ids(await list({ sort: 'joined_asc' }).expect(200))).toEqual(
        [...names].reverse(),
      );
      expect(ids(await list({ sort: 'active_desc' }).expect(200))).toEqual(
        [...names].reverse(),
      );
      expect(ids(await list({ sort: 'active_asc' }).expect(200))).toEqual(
        names,
      );
    });

    it('cursor pagination walks every user exactly once, in both sorts, with a stable total', async () => {
      for (const sort of ['joined_desc', 'active_asc']) {
        const seen: string[] = [];
        let cursor: string | undefined;
        let pages = 0;
        do {
          const res = await list({
            sort,
            limit: 2,
            ...(cursor ? { cursor } : {}),
          }).expect(200);
          expect(res.body.total).toBe(5);
          seen.push(...pluck(res.body.items, 'username'));
          cursor = res.body.nextCursor ?? undefined;
          pages += 1;
        } while (cursor);
        expect(pages).toBe(3);
        expect(new Set(seen).size).toBe(5);
      }
    });

    it('breaks ties on identical timestamps by id, without skipping or repeating', async () => {
      const same = new Date(Date.now() - 3_600_000);
      await prisma.user.updateMany({
        where: { id: { in: users.map((u) => u.id) } },
        data: { createdAt: same },
      });
      const seen: string[] = [];
      let cursor: string | undefined;
      do {
        const res = await list({
          limit: 2,
          ...(cursor ? { cursor } : {}),
        }).expect(200);
        seen.push(...pluck(res.body.items, 'id'));
        cursor = res.body.nextCursor ?? undefined;
      } while (cursor);
      expect(seen).toHaveLength(5);
      expect(new Set(seen).size).toBe(5);
    });

    it('filters: status blocked / locked / active, role, joined', async () => {
      await send('post', `/v1/admin/users/${users[1].id}/block`, {
        reasonCode: 'spam',
        note: 'list test',
      }).expect(200);
      for (let i = 0; i < 5; i++) {
        await request(server())
          .post('/v1/auth/log-in')
          .send({ username: users[2].username, password: 'wrong-password' });
      }

      const blocked = await list({ status: 'blocked' }).expect(200);
      expect(pluck(blocked.body.items, 'id')).toEqual([users[1].id]);
      expect(blocked.body.items[0].status).toBe('blocked');

      const locked = await list({ status: 'locked' }).expect(200);
      expect(pluck(locked.body.items, 'id')).toEqual([users[2].id]);
      expect(locked.body.items[0].status).toBe('locked');

      const active = await list({ status: 'active' }).expect(200);
      expect(active.body.total).toBe(3);
      expect(
        pluck(active.body.items, 'status').every((st) => st === 'active'),
      ).toBe(true);

      expect((await list({ role: 'admin' }).expect(200)).body.total).toBe(0);
      await prisma.user.update({
        where: { id: users[4].id },
        data: { createdAt: new Date(Date.now() - 10 * 86_400_000) },
      });
      expect((await list({ joined: 'today' }).expect(200)).body.total).toBe(4);
      expect((await list({ joined: '7d' }).expect(200)).body.total).toBe(4);
      expect((await list({ joined: '30d' }).expect(200)).body.total).toBe(5);
      expect(
        (
          await request(server())
            .get('/v1/admin/users')
            .set(...as(admin))
            .query({ role: 'admin' })
            .expect(200)
        ).body.total,
      ).toBeGreaterThanOrEqual(1);
    });

    it('400 VALIDATION_FAILED for bad filters, limit and cursor', async () => {
      const badQueries: Array<Record<string, string | number>> = [
        { status: 'nope' },
        { role: 'root' },
        { joined: 'year' },
        { sort: 'name' },
        { limit: 0 },
        { limit: 101 },
        { limit: 'x' },
      ];
      for (const query of badQueries) {
        expect((await list(query).expect(400)).body.code).toBe(
          'VALIDATION_FAILED',
        );
      }
      const bad = await list({ cursor: 'not-a-cursor' }).expect(400);
      expect(bad.body).toMatchObject({
        code: 'VALIDATION_FAILED',
        fieldErrors: { cursor: ['invalid'] },
      });
    });
  });

  describe('GET /v1/admin/users/:id (AC15)', () => {
    it('200: facts, masked phone, sessions count, level reserved', async () => {
      const user = await signUp(app);
      await request(server())
        .post('/v1/auth/log-in')
        .send({ username: user.username, password: user.password })
        .expect(200);
      const res = await get(`/v1/admin/users/${user.id}`).expect(200);
      expect(res.body).toMatchObject({
        id: user.id,
        username: user.username,
        role: 'user',
        status: 'active',
        locale: 'en',
        recoveryPhoneMasked: null,
        recoveryPhoneVerified: false,
        blockedAt: null,
        blockReasonCode: null,
        lockedForSec: null,
        sessionsCount: 2,
        level: null,
      });
    });

    it('shows how long a lockout still lasts', async () => {
      const user = await signUp(app);
      for (let i = 0; i < 5; i++) {
        await request(server())
          .post('/v1/auth/log-in')
          .send({ username: user.username, password: 'wrong-password' });
      }
      const res = await get(`/v1/admin/users/${user.id}`).expect(200);
      expect(res.body.status).toBe('locked');
      expect(res.body.lockedForSec).toBeGreaterThan(14 * 60);
    });

    it('404 NOT_FOUND for an unknown id; 400 for a non-uuid', async () => {
      expect(
        (
          await get(
            '/v1/admin/users/0198a000-0000-7000-8000-000000000000',
          ).expect(404)
        ).body.code,
      ).toBe('NOT_FOUND');
      expect(
        (await get('/v1/admin/users/not-a-uuid').expect(400)).body.code,
      ).toBe('VALIDATION_FAILED');
    });
  });

  describe('admin actions and the audit log (AC15)', () => {
    it('block: signs the user out everywhere, records the reason, audit row appended', async () => {
      const user = await signUp(app);
      const second = await request(server())
        .post('/v1/auth/log-in')
        .send({ username: user.username, password: user.password })
        .expect(200);

      const res = await send('post', `/v1/admin/users/${user.id}/block`, {
        reasonCode: 'spam',
        note: 'posting ads',
      }).expect(200);
      expect(res.body).toMatchObject({
        status: 'blocked',
        blockReasonCode: 'spam',
        sessionsCount: 0,
      });
      expect(res.body.blockedAt).toEqual(expect.any(String));

      expect(
        (
          await request(server())
            .post('/v1/auth/refresh')
            .send({ refreshToken: user.refreshToken })
            .expect(403)
        ).body.code,
      ).toBe('ACCOUNT_BLOCKED');
      expect(
        (
          await request(server())
            .post('/v1/auth/refresh')
            .send({ refreshToken: second.body.refreshToken })
            .expect(403)
        ).body.code,
      ).toBe('ACCOUNT_BLOCKED');

      const audit = await get(`/v1/admin/users/${user.id}/audit`).expect(200);
      expect(audit.body.items).toHaveLength(1);
      expect(audit.body.items[0]).toMatchObject({
        action: 'block',
        reasonCode: 'spam',
        note: 'posting ads',
        admin: { id: admin.id, username: admin.username },
      });
    });

    it('block: 409 ALREADY_BLOCKED, 404 NOT_FOUND, 400 for a missing reason or bad code; nothing is audited on failure', async () => {
      const user = await signUp(app);
      await send('post', `/v1/admin/users/${user.id}/block`, {
        reasonCode: 'abuse',
        note: 'first',
      }).expect(200);
      expect(
        (
          await send('post', `/v1/admin/users/${user.id}/block`, {
            reasonCode: 'abuse',
            note: 'again',
          }).expect(409)
        ).body.code,
      ).toBe('ALREADY_BLOCKED');
      expect(
        (
          await send(
            'post',
            '/v1/admin/users/0198a000-0000-7000-8000-000000000000/block',
            { reasonCode: 'abuse', note: 'x' },
          ).expect(404)
        ).body.code,
      ).toBe('NOT_FOUND');
      await send('post', `/v1/admin/users/${user.id}/block`, {
        reasonCode: 'abuse',
      }).expect(400);
      await send('post', `/v1/admin/users/${user.id}/block`, {
        reasonCode: 'rude',
        note: 'x',
      }).expect(400);
      await send('post', `/v1/admin/users/${user.id}/block`, {
        reasonCode: 'abuse',
        note: '',
      }).expect(400);
      expect(
        await prisma.adminAuditLog.count({ where: { userId: user.id } }),
      ).toBe(1);
    });

    it('unblock: clears the block, audited; 409 NOT_BLOCKED when not blocked', async () => {
      const user = await signUp(app);
      expect(
        (
          await send('post', `/v1/admin/users/${user.id}/unblock`, {
            note: 'x',
          }).expect(409)
        ).body.code,
      ).toBe('NOT_BLOCKED');
      await send('post', `/v1/admin/users/${user.id}/block`, {
        reasonCode: 'other',
        note: 'because',
      }).expect(200);
      const res = await send('post', `/v1/admin/users/${user.id}/unblock`, {
        note: 'appeal accepted',
      }).expect(200);
      expect(res.body).toMatchObject({
        status: 'active',
        blockedAt: null,
        blockReasonCode: null,
      });
      const audit = await get(`/v1/admin/users/${user.id}/audit`).expect(200);
      expect(pluck(audit.body.items, 'action')).toEqual(['unblock', 'block']);
    });

    it('set password: 204, old password dead, new one works, signed out everywhere, audited without the password', async () => {
      const user = await signUp(app);
      const newPassword = 'admin-chosen-pw-9';
      await send('put', `/v1/admin/users/${user.id}/password`, {
        newPassword,
        note: 'user called support',
      }).expect(204);

      await request(server())
        .post('/v1/auth/log-in')
        .send({ username: user.username, password: user.password })
        .expect(401);
      await request(server())
        .post('/v1/auth/log-in')
        .send({ username: user.username, password: newPassword })
        .expect(200);
      await request(server())
        .post('/v1/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(401);

      const audit = await get(`/v1/admin/users/${user.id}/audit`).expect(200);
      expect(audit.body.items[0]).toMatchObject({
        action: 'set_password',
        note: 'user called support',
      });
      expect(JSON.stringify(audit.body)).not.toContain(newPassword);
      const rows = await prisma.adminAuditLog.findMany({
        where: { userId: user.id },
      });
      expect(JSON.stringify(rows)).not.toContain(newPassword);
    });

    it('set password: 400 PASSWORD_WEAK and 404; lifts a lockout', async () => {
      const user = await signUp(app);
      const weak = await send('put', `/v1/admin/users/${user.id}/password`, {
        newPassword: 'qwerty',
        note: 'x',
      }).expect(400);
      expect(weak.body).toMatchObject({
        code: 'PASSWORD_WEAK',
        fieldErrors: { newPassword: ['tooCommon'] },
      });
      await send('put', `/v1/admin/users/${user.id}/password`, {
        newPassword: user.username,
        note: 'x',
      }).expect(400);
      await send(
        'put',
        '/v1/admin/users/0198a000-0000-7000-8000-000000000000/password',
        { newPassword: 'long-enough-pw', note: 'x' },
      ).expect(404);
      expect(
        await prisma.adminAuditLog.count({ where: { userId: user.id } }),
      ).toBe(0);

      for (let i = 0; i < 5; i++) {
        await request(server())
          .post('/v1/auth/log-in')
          .send({ username: user.username, password: 'wrong-password' });
      }
      await send('put', `/v1/admin/users/${user.id}/password`, {
        newPassword: 'long-enough-pw',
        note: 'unlock',
      }).expect(204);
      await request(server())
        .post('/v1/auth/log-in')
        .send({ username: user.username, password: 'long-enough-pw' })
        .expect(200);
    });

    it('recovery phone: verified at once, masked in the response, never in the audit log', async () => {
      const user = await signUp(app);
      const res = await send(
        'put',
        `/v1/admin/users/${user.id}/recovery-phone`,
        { phone: '+998 91 234 56 78', note: 'verified by call' },
      ).expect(200);
      expect(res.body).toMatchObject({
        recoveryPhoneMasked: '+998 •• ••• •• 78',
        recoveryPhoneVerified: true,
      });

      const me = await request(server())
        .get('/v1/me')
        .set(...as(user))
        .expect(200);
      expect(me.body.hasRecoveryPhone).toBe(true);
      const audit = await get(`/v1/admin/users/${user.id}/audit`).expect(200);
      expect(audit.body.items[0]).toMatchObject({
        action: 'set_recovery_phone',
      });
      expect(JSON.stringify(audit.body)).not.toMatch(/912345678/);
    });

    it('recovery phone: 400 PHONE_INVALID, 404', async () => {
      const user = await signUp(app);
      expect(
        (
          await send('put', `/v1/admin/users/${user.id}/recovery-phone`, {
            phone: '12345',
            note: 'x',
          }).expect(400)
        ).body.code,
      ).toBe('PHONE_INVALID');
      await send(
        'put',
        '/v1/admin/users/0198a000-0000-7000-8000-000000000000/recovery-phone',
        { phone: '+998900000009', note: 'x' },
      ).expect(404);
    });

    it('role: promotes and demotes, audited with from/to; takes effect on the next request', async () => {
      const user = await signUp(app);
      const up = await send('put', `/v1/admin/users/${user.id}/role`, {
        role: 'admin',
        note: 'new teammate',
      }).expect(200);
      expect(up.body.role).toBe('admin');
      await get('/v1/admin/stats/users', user).expect(200);

      await send('put', `/v1/admin/users/${user.id}/role`, {
        role: 'user',
        note: 'left the team',
      }).expect(200);
      await get('/v1/admin/stats/users', user).expect(403);

      const audit = await get(`/v1/admin/users/${user.id}/audit`).expect(200);
      expect(pluck(audit.body.items, 'detail')).toEqual([
        'role: admin -> user',
        'role: user -> admin',
      ]);
    });

    it('role: 403 CANNOT_CHANGE_OWN_ROLE, 404, 400; an unchanged role writes no audit row', async () => {
      expect(
        (
          await send('put', `/v1/admin/users/${admin.id}/role`, {
            role: 'user',
            note: 'oops',
          }).expect(403)
        ).body.code,
      ).toBe('CANNOT_CHANGE_OWN_ROLE');
      await send(
        'put',
        '/v1/admin/users/0198a000-0000-7000-8000-000000000000/role',
        { role: 'admin', note: 'x' },
      ).expect(404);
      const user = await signUp(app);
      await send('put', `/v1/admin/users/${user.id}/role`, {
        role: 'operator',
        note: 'x',
      }).expect(400);
      await send('put', `/v1/admin/users/${user.id}/role`, {
        role: 'user',
        note: 'no-op',
      }).expect(200);
      expect(
        await prisma.adminAuditLog.count({ where: { userId: user.id } }),
      ).toBe(0);
    });

    it('a failing action rolls back as a whole (no half-applied block without audit)', async () => {
      const user = await signUp(app);
      await prisma.$executeRaw`ALTER TABLE admin_audit_logs ADD CONSTRAINT audit_test_fail CHECK (note <> 'boom')`;
      try {
        await send('post', `/v1/admin/users/${user.id}/block`, {
          reasonCode: 'spam',
          note: 'boom',
        }).expect(500);
      } finally {
        await prisma.$executeRaw`ALTER TABLE admin_audit_logs DROP CONSTRAINT audit_test_fail`;
      }
      const row = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(row.blockedAt).toBeNull();
      expect(
        await prisma.refreshToken.count({
          where: { userId: user.id, revokedAt: null },
        }),
      ).toBe(1);
    });

    it('audit: paginated newest first; 404 for an unknown user', async () => {
      const user = await signUp(app);
      for (let i = 0; i < 3; i++) {
        await send('post', `/v1/admin/users/${user.id}/block`, {
          reasonCode: 'spam',
          note: `n${i}`,
        }).expect(200);
        await send('post', `/v1/admin/users/${user.id}/unblock`, {
          note: `u${i}`,
        }).expect(200);
      }
      const page1 = await get(`/v1/admin/users/${user.id}/audit`)
        .query({ limit: 4 })
        .expect(200);
      expect(page1.body.items).toHaveLength(4);
      expect(page1.body.items[0].note).toBe('u2');
      const page2 = await get(`/v1/admin/users/${user.id}/audit`)
        .query({ limit: 4, cursor: page1.body.nextCursor })
        .expect(200);
      expect(pluck(page2.body.items, 'note')).toEqual(['u0', 'n0']);
      expect(page2.body.nextCursor).toBeNull();
      expect(
        (
          await get(
            '/v1/admin/users/0198a000-0000-7000-8000-000000000000/audit',
          ).expect(404)
        ).body.code,
      ).toBe('NOT_FOUND');
      await get(`/v1/admin/users/${user.id}/audit`)
        .query({ cursor: 'junk' })
        .expect(400);
    });
  });

  describe('npm run admin:create backend (AC16)', () => {
    let bootstrap: AdminBootstrapService;
    beforeAll(() => {
      bootstrap = app.get(AdminBootstrapService);
    });

    it('creates an admin who can log in to the admin panel; the password is hashed', async () => {
      const username = uniqueName('boss');
      expect(await bootstrap.createOrPromote(username, GOOD_PASSWORD)).toEqual({
        kind: 'created',
        username,
      });
      const row = await prisma.user.findUniqueOrThrow({ where: { username } });
      expect(row.role).toBe('admin');
      expect(row.passwordHash).toMatch(/^\$argon2id\$/);
      await request(server())
        .post('/v1/admin/auth/log-in')
        .send({ username, password: GOOD_PASSWORD })
        .expect(200);
    });

    it('allows reserved names such as admin (the public API never can)', async () => {
      const outcome = await bootstrap.createOrPromote('Support', GOOD_PASSWORD);
      expect(outcome).toEqual({ kind: 'created', username: 'support' });
    });

    it('promotes an existing user without touching their password', async () => {
      const user = await signUp(app);
      const before = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(await bootstrap.createOrPromote(user.username, null)).toEqual({
        kind: 'promoted',
        username: user.username,
      });
      const after = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(after.role).toBe('admin');
      expect(after.passwordHash).toBe(before.passwordHash);
      expect(await bootstrap.createOrPromote(user.username, null)).toEqual({
        kind: 'already_admin',
        username: user.username,
      });
    });

    it('refuses a weak password, a malformed username, a missing password for a new user, and a blocked user', async () => {
      await expect(
        bootstrap.createOrPromote(uniqueName('boss'), '123456'),
      ).rejects.toMatchObject({ code: 'PASSWORD_WEAK' });
      await expect(
        bootstrap.createOrPromote('no spaces!', GOOD_PASSWORD),
      ).rejects.toThrow(/not valid/);
      await expect(
        bootstrap.createOrPromote(uniqueName('boss'), null),
      ).rejects.toThrow(/password is required/);
      const user = await signUp(app);
      await prisma.user.update({
        where: { id: user.id },
        data: { blockedAt: new Date(), blockReasonCode: 'spam' },
      });
      await expect(
        bootstrap.createOrPromote(user.username, null),
      ).rejects.toThrow(/blocked/);
    });

    it('the public API cannot create admins: sign-up ignores a role field', async () => {
      const res = await request(server())
        .post('/v1/auth/sign-up')
        .send({
          username: uniqueName(),
          password: GOOD_PASSWORD,
          locale: 'en',
          acceptTerms: true,
          role: 'admin',
        })
        .expect(400);
      expect(res.body.fieldErrors).toHaveProperty('role');
    });
  });
});

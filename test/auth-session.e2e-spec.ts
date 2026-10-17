import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import {
  type Account,
  bearer,
  makeAdmin,
  resetAttempts,
  signUp,
  uniqueName,
} from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

describe('log-in, lockout, refresh, sign-out, blocked users (e2e) - AC4, AC9, AC11', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;

  const server = () => app.getHttpServer();
  const logIn = (username: string, password: string) =>
    request(server()).post('/v1/auth/log-in').send({ username, password });
  const refresh = (refreshToken: string) =>
    request(server()).post('/v1/auth/refresh').send({ refreshToken });

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  beforeEach(async () => {
    await resetAttempts(app);
  });

  describe('POST /v1/auth/log-in', () => {
    it('200: tokens + me; username is case-insensitive', async () => {
      const account = await signUp(app);
      const res = await logIn(
        account.username.toUpperCase(),
        account.password,
      ).expect(200);
      expect(res.body).toMatchObject({
        expiresIn: 900,
        me: { id: account.id, username: account.username },
      });
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it('401 INVALID_CREDENTIALS: one generic answer for a wrong password and an unknown username', async () => {
      const account = await signUp(app);
      const wrongPassword = await logIn(
        account.username,
        'not-the-password',
      ).expect(401);
      const unknownUser = await logIn(
        uniqueName('nobody'),
        'not-the-password',
      ).expect(401);

      expect(wrongPassword.body).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        statusCode: 401,
      });
      expect(unknownUser.body.code).toBe(wrongPassword.body.code);
      expect(unknownUser.body.message).toBe(wrongPassword.body.message);
    });

    it('400 VALIDATION_FAILED for missing fields', async () => {
      const res = await request(server())
        .post('/v1/auth/log-in')
        .send({ username: 'x' })
        .expect(400);
      expect(res.body.fieldErrors).toHaveProperty('password');
    });

    it('423 ACCOUNT_LOCKED on the 5th wrong password, with retryAfterSec ~15 min', async () => {
      const account = await signUp(app);
      for (let i = 0; i < 4; i++) {
        await logIn(account.username, 'wrong-password').expect(401);
      }
      const fifth = await logIn(account.username, 'wrong-password').expect(423);
      expect(fifth.body.code).toBe('ACCOUNT_LOCKED');
      expect(fifth.body.retryAfterSec).toBeGreaterThan(14 * 60);
      expect(fifth.body.retryAfterSec).toBeLessThanOrEqual(15 * 60);
    });

    it('stays locked even for the right password, and attempts while locked do not extend the lock', async () => {
      const account = await signUp(app);
      for (let i = 0; i < 5; i++)
        await logIn(account.username, 'wrong-password');

      const before = await prisma.loginAttempt.count({
        where: { username: account.username },
      });
      const locked = await logIn(account.username, account.password).expect(
        423,
      );
      expect(locked.body.code).toBe('ACCOUNT_LOCKED');
      await logIn(account.username, 'wrong-password').expect(423);
      expect(
        await prisma.loginAttempt.count({
          where: { username: account.username },
        }),
      ).toBe(before);
    });

    it('locks unknown usernames the same way (no enumeration)', async () => {
      const ghost = uniqueName('ghost');
      for (let i = 0; i < 4; i++)
        await logIn(ghost, 'wrong-password').expect(401);
      await logIn(ghost, 'wrong-password').expect(423);
    });

    it('unlocks 15 minutes after the latest failure', async () => {
      const account = await signUp(app);
      for (let i = 0; i < 5; i++)
        await logIn(account.username, 'wrong-password');
      await logIn(account.username, account.password).expect(423);

      await prisma.loginAttempt.updateMany({
        where: { username: account.username },
        data: { at: new Date(Date.now() - 15 * 60_000 - 1000) },
      });
      await logIn(account.username, account.password).expect(200);
    });

    it('a successful log-in resets the failure count', async () => {
      const account = await signUp(app);
      for (let i = 0; i < 4; i++)
        await logIn(account.username, 'wrong-password').expect(401);
      await logIn(account.username, account.password).expect(200);
      for (let i = 0; i < 4; i++)
        await logIn(account.username, 'wrong-password').expect(401);
    });

    it('429 RATE_LIMITED per IP after 20 wrong passwords across different usernames', async () => {
      for (let i = 0; i < 20; i++) {
        await logIn(uniqueName('spray'), 'wrong-password').expect(401);
      }
      const res = await logIn(uniqueName('spray'), 'wrong-password').expect(
        429,
      );
      expect(res.body.code).toBe('RATE_LIMITED');
      expect(res.body.retryAfterSec).toBeGreaterThan(0);
      const real = await signUp(app);
      await logIn(real.username, real.password).expect(429);
    });
  });

  describe('POST /v1/auth/refresh', () => {
    it('200: rotates the refresh token; the new access token works', async () => {
      const account = await signUp(app);
      const res = await refresh(account.refreshToken).expect(200);
      expect(res.body.refreshToken).not.toBe(account.refreshToken);
      await request(server())
        .get('/v1/me')
        .set(...bearer(res.body.accessToken))
        .expect(200);

      const row = await prisma.refreshToken.findFirstOrThrow({
        where: { userId: account.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(row.tokenHash).not.toBe(account.refreshToken);
      expect(row.revokedAt).not.toBeNull();
      expect(row.replacedById).not.toBeNull();
    });

    it('401 REFRESH_REUSED when a rotated token is presented again; the whole family dies', async () => {
      const account = await signUp(app);
      const rotated = await refresh(account.refreshToken).expect(200);

      const reuse = await refresh(account.refreshToken).expect(401);
      expect(reuse.body.code).toBe('REFRESH_REUSED');
      const afterReuse = await refresh(rotated.body.refreshToken).expect(401);
      expect(afterReuse.body.code).toBe('REFRESH_INVALID');
      expect(
        await prisma.refreshToken.count({
          where: { userId: account.id, revokedAt: null },
        }),
      ).toBe(0);
    });

    it('a second log-in has its own family: reuse in one does not touch the other', async () => {
      const account = await signUp(app);
      const other = await logIn(account.username, account.password).expect(200);
      const rotated = await refresh(account.refreshToken).expect(200);
      await refresh(account.refreshToken).expect(401);
      await refresh(other.body.refreshToken).expect(200);
      expect(rotated.body.refreshToken).toBeDefined();
    });

    it('two concurrent refreshes with one token: exactly one succeeds', async () => {
      const account = await signUp(app);
      const results = await Promise.all([
        refresh(account.refreshToken),
        refresh(account.refreshToken),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
    });

    it('401 REFRESH_INVALID for an unknown token and an expired one', async () => {
      const unknown = await refresh('unknown-token-value').expect(401);
      expect(unknown.body.code).toBe('REFRESH_INVALID');

      const account = await signUp(app);
      await prisma.refreshToken.updateMany({
        where: { userId: account.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      expect((await refresh(account.refreshToken).expect(401)).body.code).toBe(
        'REFRESH_INVALID',
      );
    });

    it('400 VALIDATION_FAILED without a refreshToken', async () => {
      await request(server()).post('/v1/auth/refresh').send({}).expect(400);
    });
  });

  describe('POST /v1/auth/sign-out', () => {
    it('204: revokes the refresh token; refreshing with it then fails', async () => {
      const account = await signUp(app);
      await request(server())
        .post('/v1/auth/sign-out')
        .set(...bearer(account.accessToken))
        .send({ refreshToken: account.refreshToken })
        .expect(204);
      expect((await refresh(account.refreshToken).expect(401)).body.code).toBe(
        'REFRESH_INVALID',
      );
    });

    it("204 and nothing revoked when the token is someone else's", async () => {
      const a = await signUp(app);
      const b = await signUp(app);
      await request(server())
        .post('/v1/auth/sign-out')
        .set(...bearer(a.accessToken))
        .send({ refreshToken: b.refreshToken })
        .expect(204);
      await refresh(b.refreshToken).expect(200);
    });

    it('401 without an access token; 400 without a body', async () => {
      await request(server())
        .post('/v1/auth/sign-out')
        .send({ refreshToken: 'x' })
        .expect(401);
      const account = await signUp(app);
      await request(server())
        .post('/v1/auth/sign-out')
        .set(...bearer(account.accessToken))
        .send({})
        .expect(400);
    });
  });

  describe('blocked users (AC11)', () => {
    let admin: Account;
    beforeAll(async () => {
      admin = await makeAdmin(app);
    });

    const block = (id: string, reasonCode = 'spam') =>
      request(server())
        .post(`/v1/admin/users/${id}/block`)
        .set(...bearer(admin.accessToken))
        .send({ reasonCode, note: 'test block' });

    it('log-in is refused with ACCOUNT_BLOCKED and the reason category', async () => {
      const user = await signUp(app);
      await block(user.id, 'abuse').expect(200);
      const res = await logIn(user.username, user.password).expect(403);
      expect(res.body).toMatchObject({
        code: 'ACCOUNT_BLOCKED',
        reasonCode: 'abuse',
      });
    });

    it('a wrong password for a blocked user is still the generic credentials error', async () => {
      const user = await signUp(app);
      await block(user.id).expect(200);
      expect(
        (await logIn(user.username, 'wrong-password').expect(401)).body.code,
      ).toBe('INVALID_CREDENTIALS');
    });

    it('refresh of a blocked user (tokens already revoked by the block) answers ACCOUNT_BLOCKED', async () => {
      const user = await signUp(app);
      const session = await logIn(user.username, user.password).expect(200);
      await block(user.id, 'safety').expect(200);
      const res = await refresh(session.body.refreshToken).expect(403);
      expect(res.body).toMatchObject({
        code: 'ACCOUNT_BLOCKED',
        reasonCode: 'safety',
      });
    });

    it('refreshing a token that survived the block (rows restored) answers ACCOUNT_BLOCKED', async () => {
      const user = await signUp(app);
      await prisma.user.update({
        where: { id: user.id },
        data: { blockedAt: new Date(), blockReasonCode: 'spam' },
      });
      const res = await refresh(user.refreshToken).expect(403);
      expect(res.body).toMatchObject({
        code: 'ACCOUNT_BLOCKED',
        reasonCode: 'spam',
      });
      expect(
        await prisma.refreshToken.count({
          where: { userId: user.id, revokedAt: null },
        }),
      ).toBe(0);
    });

    it('a signed-in user who gets blocked is refused on the next request', async () => {
      const user = await signUp(app);
      await request(server())
        .get('/v1/me')
        .set(...bearer(user.accessToken))
        .expect(200);
      await block(user.id, 'impersonation').expect(200);
      const res = await request(server())
        .get('/v1/me')
        .set(...bearer(user.accessToken))
        .expect(403);
      expect(res.body).toMatchObject({
        code: 'ACCOUNT_BLOCKED',
        reasonCode: 'impersonation',
      });
    });

    it('unblocking lets the user log in again', async () => {
      const user = await signUp(app);
      await block(user.id).expect(200);
      await request(server())
        .post(`/v1/admin/users/${user.id}/unblock`)
        .set(...bearer(admin.accessToken))
        .send({ note: 'appeal accepted' })
        .expect(200);
      await logIn(user.username, user.password).expect(200);
    });
  });

  describe('last_active_at (updated at most once per hour)', () => {
    it('is not rewritten within the hour, and is refreshed after it', async () => {
      const user = await signUp(app);
      const stale = new Date(Date.now() - 2 * 3_600_000);
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: stale },
      });

      await request(server())
        .get('/v1/me')
        .set(...bearer(user.accessToken))
        .expect(200);
      const first = (
        await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
      ).lastActiveAt;
      expect(first.getTime()).toBeGreaterThan(stale.getTime());

      await request(server())
        .get('/v1/me')
        .set(...bearer(user.accessToken))
        .expect(200);
      const second = (
        await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
      ).lastActiveAt;
      expect(second.getTime()).toBe(first.getTime());
    });
  });

  describe('deny by default', () => {
    it('401 UNAUTHENTICATED on /v1/me without a token or with a garbage token', async () => {
      expect(
        (await request(server()).get('/v1/me').expect(401)).body.code,
      ).toBe('UNAUTHENTICATED');
      await request(server())
        .get('/v1/me')
        .set('Authorization', 'Bearer garbage')
        .expect(401);
    });
  });
});

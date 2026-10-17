import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { GOOD_PASSWORD, captureSms, signUp, uniqueName } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

describe('sign-up and username availability (e2e) - AC3', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let sms: ReturnType<typeof captureSms>;

  const post = (body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/v1/auth/sign-up')
      .send({
        password: GOOD_PASSWORD,
        locale: 'en',
        acceptTerms: true,
        ...body,
      });

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    sms = captureSms(app);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  describe('POST /v1/auth/sign-up', () => {
    it('201: creates the account, logs in, returns tokens and me', async () => {
      const username = uniqueName();
      const res = await post({ username }).expect(201);

      expect(res.body).toMatchObject({
        expiresIn: 900,
        me: {
          username,
          locale: 'en',
          role: 'user',
          hasRecoveryPhone: false,
          recoveryPhonePending: false,
        },
      });
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');

      await request(app.getHttpServer())
        .get('/v1/me')
        .set('Authorization', `Bearer ${res.body.accessToken}`)
        .expect(200);
    });

    it('stores usernames lowercase, hashes the password with Argon2id', async () => {
      const username = uniqueName('mixed');
      const res = await post({ username: username.toUpperCase() }).expect(201);
      expect(res.body.me.username).toBe(username);

      const row = await app.get(PrismaService).user.findUniqueOrThrow({
        where: { id: res.body.me.id },
      });
      expect(row.passwordHash).toMatch(/^\$argon2id\$/);
      expect(row.passwordHash).not.toContain(GOOD_PASSWORD);
      expect(row.termsAcceptedAt).not.toBeNull();
    });

    it('with a recovery phone: sends a code, the phone stays pending and encrypted', async () => {
      sms.clear();
      const res = await post({
        username: uniqueName(),
        recoveryPhone: '+998 90 000-00-01',
      }).expect(201);

      expect(res.body.me).toMatchObject({
        hasRecoveryPhone: false,
        recoveryPhonePending: true,
      });
      expect(sms.last()).toMatchObject({
        purpose: 'phone_verify',
        phone: '+998900000001',
      });
      const stored = await app.get(PrismaService).smsCode.findFirstOrThrow({
        where: { userId: res.body.me.id },
      });
      expect(stored.phone).not.toContain('900000001');
      expect(stored.codeHash).not.toContain(sms.last().code);
    });

    it('400 VALIDATION_FAILED: missing and mistyped fields, unknown fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/sign-up')
        .send({ username: 123, locale: 'xx', acceptTerms: 'yes', extra: 1 })
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(Object.keys(res.body.fieldErrors)).toEqual(
        expect.arrayContaining([
          'username',
          'password',
          'locale',
          'acceptTerms',
          'extra',
        ]),
      );
    });

    it.each([
      ['ab', 'tooShort'],
      ['a'.repeat(21), 'tooLong'],
      ['bad name', 'badCharacters'],
      ['.leading', 'dotAtEdge'],
      ['trailing.', 'dotAtEdge'],
    ])('400 USERNAME_INVALID for %s', async (username, problem) => {
      const res = await post({ username }).expect(400);
      expect(res.body).toMatchObject({
        code: 'USERNAME_INVALID',
        fieldErrors: { username: [problem] },
      });
    });

    it.each([
      'admin',
      'Irbis',
      'support',
      'moderator',
      'root',
      'system',
      'official',
      'ad.min',
    ])('400 USERNAME_RESERVED for %s', async (username) => {
      const res = await post({ username }).expect(400);
      expect(res.body.code).toBe('USERNAME_RESERVED');
    });

    it.each([
      ['short', 'tooShort'],
      ['x'.repeat(65), 'tooLong'],
      ['123456', 'tooCommon'],
      ['Password', 'tooCommon'],
    ])('400 PASSWORD_WEAK for %s', async (password, problem) => {
      const res = await post({ username: uniqueName(), password }).expect(400);
      expect(res.body).toMatchObject({
        code: 'PASSWORD_WEAK',
        fieldErrors: { password: [problem] },
      });
    });

    it('400 PASSWORD_WEAK when the password equals the username (any case)', async () => {
      const username = uniqueName();
      const res = await post({
        username,
        password: username.toUpperCase(),
      }).expect(400);
      expect(res.body.fieldErrors).toEqual({ password: ['sameAsUsername'] });
    });

    it('400 TERMS_REQUIRED when the terms are not accepted', async () => {
      const res = await post({
        username: uniqueName(),
        acceptTerms: false,
      }).expect(400);
      expect(res.body.code).toBe('TERMS_REQUIRED');
    });

    it('400 PHONE_INVALID for a phone that is not +998 and 9 digits', async () => {
      const res = await post({
        username: uniqueName(),
        recoveryPhone: '+7 999 123 45 67',
      }).expect(400);
      expect(res.body.code).toBe('PHONE_INVALID');
    });

    it('409 USERNAME_TAKEN, case-insensitively', async () => {
      const taken = await signUp(app);
      const res = await post({ username: taken.username.toUpperCase() }).expect(
        409,
      );
      expect(res.body).toMatchObject({
        code: 'USERNAME_TAKEN',
        statusCode: 409,
      });
      expect(res.body.requestId).toEqual(expect.any(String));
    });

    it('409 for two sign-ups racing for one name: exactly one wins', async () => {
      const username = uniqueName();
      const results = await Promise.all([
        post({ username }),
        post({ username }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    });
  });

  describe('GET /v1/auth/username-available', () => {
    const check = (u: string) =>
      request(app.getHttpServer())
        .get('/v1/auth/username-available')
        .query({ u });

    it('200 available for a free valid name (public, no token)', async () => {
      const res = await check(uniqueName()).expect(200);
      expect(res.body).toEqual({ available: true });
    });

    it('reports taken (any case), invalid and reserved', async () => {
      const taken = await signUp(app);
      expect(
        (await check(taken.username.toUpperCase()).expect(200)).body,
      ).toEqual({
        available: false,
        reason: 'taken',
      });
      expect((await check('a').expect(200)).body).toEqual({
        available: false,
        reason: 'invalid',
      });
      expect((await check('has space').expect(200)).body).toEqual({
        available: false,
        reason: 'invalid',
      });
      expect((await check('Admin').expect(200)).body).toEqual({
        available: false,
        reason: 'reserved',
      });
    });

    it('400 VALIDATION_FAILED without u or with an oversize u', async () => {
      await request(app.getHttpServer())
        .get('/v1/auth/username-available')
        .expect(400);
      const res = await check('x'.repeat(65)).expect(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
    });
  });
});

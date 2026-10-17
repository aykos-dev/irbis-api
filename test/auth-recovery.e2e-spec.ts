import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import {
  type Account,
  bearer,
  captureSms,
  resetAttempts,
  signUp,
} from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const PHONE = '+998900000002';

describe('password reset, recovery phone, /me, guest merge (e2e) - AC5, AC6, AC8', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let sms: ReturnType<typeof captureSms>;

  const server = () => app.getHttpServer();
  const forgot = (username: string) =>
    request(server()).post('/v1/auth/password/forgot').send({ username });
  const reset = (
    username: string,
    code: string,
    newPassword = 'fresh-pass-77',
  ) =>
    request(server())
      .post('/v1/auth/password/reset')
      .send({ username, code, newPassword });
  const putPhone = (account: Account, phone: string) =>
    request(server())
      .put('/v1/me/recovery-phone')
      .set(...bearer(account.accessToken))
      .send({ phone });
  const verify = (account: Account, code: string) =>
    request(server())
      .post('/v1/me/recovery-phone/verify')
      .set(...bearer(account.accessToken))
      .send({ code });
  const wrongCode = (code: string): string =>
    code === '000000' ? '000001' : '000000';

  /** Signs up, adds and verifies a recovery phone. */
  async function accountWithPhone(): Promise<Account> {
    const account = await signUp(app);
    await putPhone(account, PHONE).expect(202);
    await verify(account, sms.last().code).expect(200);
    sms.clear();
    return account;
  }

  /** Makes the resend cooldown pass without waiting. */
  const ageCodes = (userId: string, ms: number) =>
    prisma.smsCode.updateMany({
      where: { userId },
      data: { createdAt: new Date(Date.now() - ms) },
    });

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    sms = captureSms(app);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  beforeEach(async () => {
    await resetAttempts(app);
    sms.clear();
  });

  describe('PUT /v1/me/recovery-phone and POST /v1/me/recovery-phone/verify (AC6)', () => {
    it('add: 202 and a code is sent; verify: phone is marked verified and stored encrypted', async () => {
      const account = await signUp(app);
      const res = await putPhone(account, '+998 90 000-00-02').expect(202);
      expect(res.body).toEqual({ resendAfterSec: 60 });
      expect(sms.last()).toMatchObject({
        purpose: 'phone_verify',
        phone: PHONE,
        userId: account.id,
      });

      const pending = await request(server())
        .get('/v1/me')
        .set(...bearer(account.accessToken))
        .expect(200);
      expect(pending.body).toMatchObject({
        hasRecoveryPhone: false,
        recoveryPhonePending: true,
      });

      const verified = await verify(account, sms.last().code).expect(200);
      expect(verified.body).toMatchObject({
        hasRecoveryPhone: true,
        recoveryPhonePending: false,
      });

      const row = await prisma.user.findUniqueOrThrow({
        where: { id: account.id },
      });
      expect(row.recoveryPhoneVerifiedAt).not.toBeNull();
      expect(row.recoveryPhone).not.toBeNull();
      expect(row.recoveryPhone).not.toContain('900000002');
    });

    it('401 without a token', async () => {
      await request(server())
        .put('/v1/me/recovery-phone')
        .send({ phone: PHONE })
        .expect(401);
      await request(server())
        .post('/v1/me/recovery-phone/verify')
        .send({ code: '123456' })
        .expect(401);
    });

    it('400 PHONE_INVALID / VALIDATION_FAILED', async () => {
      const account = await signUp(app);
      expect(
        (await putPhone(account, '+7 900 000 00 02').expect(400)).body.code,
      ).toBe('PHONE_INVALID');
      expect((await putPhone(account, '+99890000').expect(400)).body.code).toBe(
        'PHONE_INVALID',
      );
      await request(server())
        .put('/v1/me/recovery-phone')
        .set(...bearer(account.accessToken))
        .send({})
        .expect(400);
      await verify(account, 'abc').expect(400);
    });

    it('429 RATE_LIMITED when asking again within 60 s; no second SMS', async () => {
      const account = await signUp(app);
      await putPhone(account, PHONE).expect(202);
      const res = await putPhone(account, PHONE).expect(429);
      expect(res.body).toMatchObject({
        code: 'RATE_LIMITED',
        retryAfterSec: 60,
      });
      expect(sms.all).toHaveLength(1);
    });

    it('429 RATE_LIMITED after 5 codes in a day', async () => {
      const account = await signUp(app);
      for (let i = 0; i < 5; i++) {
        await putPhone(account, PHONE).expect(202);
        await ageCodes(account.id, 2 * 60_000);
      }
      await putPhone(account, PHONE).expect(429);
    });

    it('CODE_INVALID for a wrong code (400); CODE_ATTEMPTS (429) on the third wrong try, then even the right code fails', async () => {
      const account = await signUp(app);
      await putPhone(account, PHONE).expect(202);
      const code = sms.last().code;

      expect(
        (await verify(account, wrongCode(code)).expect(400)).body.code,
      ).toBe('CODE_INVALID');
      expect(
        (await verify(account, wrongCode(code)).expect(400)).body.code,
      ).toBe('CODE_INVALID');
      expect(
        (await verify(account, wrongCode(code)).expect(429)).body.code,
      ).toBe('CODE_ATTEMPTS');
      expect((await verify(account, code).expect(429)).body.code).toBe(
        'CODE_ATTEMPTS',
      );
    });

    it('CODE_EXPIRED (400) after 5 minutes', async () => {
      const account = await signUp(app);
      await putPhone(account, PHONE).expect(202);
      await prisma.smsCode.updateMany({
        where: { userId: account.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      expect(
        (await verify(account, sms.last().code).expect(400)).body.code,
      ).toBe('CODE_EXPIRED');
    });

    it('CODE_INVALID when no code was requested, and a code works only once', async () => {
      const account = await signUp(app);
      expect((await verify(account, '123456').expect(400)).body.code).toBe(
        'CODE_INVALID',
      );
      await putPhone(account, PHONE).expect(202);
      const code = sms.last().code;
      await verify(account, code).expect(200);
      expect((await verify(account, code).expect(400)).body.code).toBe(
        'CODE_INVALID',
      );
    });

    it('changing the phone keeps the old verified one until the new one is verified', async () => {
      const account = await accountWithPhone();
      const before = await prisma.user.findUniqueOrThrow({
        where: { id: account.id },
      });
      await ageCodes(account.id, 2 * 60_000);
      await putPhone(account, '+998900000003').expect(202);
      const mid = await prisma.user.findUniqueOrThrow({
        where: { id: account.id },
      });
      expect(mid.recoveryPhone).toBe(before.recoveryPhone);
      await verify(account, sms.last().code).expect(200);
      const after = await prisma.user.findUniqueOrThrow({
        where: { id: account.id },
      });
      expect(after.recoveryPhone).not.toBe(before.recoveryPhone);
    });
  });

  describe('POST /v1/auth/password/forgot (AC5)', () => {
    it('202 { resendAfterSec: 60 } identically for unknown users, users without a phone, and users with one', async () => {
      const withPhone = await accountWithPhone();
      const noPhone = await signUp(app);

      const a = await forgot(withPhone.username).expect(202);
      const b = await forgot(noPhone.username).expect(202);
      const c = await forgot('nobody_here').expect(202);
      expect(a.body).toEqual({ resendAfterSec: 60 });
      expect(b.body).toEqual(a.body);
      expect(c.body).toEqual(a.body);
      expect(sms.all).toHaveLength(1);
      expect(sms.last()).toMatchObject({
        purpose: 'password_reset',
        userId: withPhone.id,
      });
    });

    it('does not send to an unverified (pending) phone', async () => {
      const account = await signUp(app);
      await putPhone(account, PHONE).expect(202);
      sms.clear();
      await forgot(account.username).expect(202);
      expect(sms.all).toHaveLength(0);
    });

    it('resend is held back for 60 s, silently', async () => {
      const account = await accountWithPhone();
      await forgot(account.username).expect(202);
      const res = await forgot(account.username).expect(202);
      expect(res.body).toEqual({ resendAfterSec: 60 });
      expect(sms.all).toHaveLength(1);

      await ageCodes(account.id, 61_000);
      await forgot(account.username).expect(202);
      expect(sms.all).toHaveLength(2);
    });

    it('at most 5 codes a day per account, silently', async () => {
      const account = await accountWithPhone();
      for (let i = 0; i < 5; i++) {
        await forgot(account.username).expect(202);
        await ageCodes(account.id, 2 * 60_000);
      }
      expect(sms.all).toHaveLength(5);
      const res = await forgot(account.username).expect(202);
      expect(res.body).toEqual({ resendAfterSec: 60 });
      expect(sms.all).toHaveLength(5);
    });

    it('sends nothing for a blocked account', async () => {
      const account = await accountWithPhone();
      await prisma.user.update({
        where: { id: account.id },
        data: { blockedAt: new Date(), blockReasonCode: 'spam' },
      });
      await forgot(account.username).expect(202);
      expect(sms.all).toHaveLength(0);
    });

    it('400 VALIDATION_FAILED without a username', async () => {
      await request(server())
        .post('/v1/auth/password/forgot')
        .send({})
        .expect(400);
    });
  });

  describe('POST /v1/auth/password/reset (AC5)', () => {
    it('200: new password works, old one does not, other sessions are signed out, caller is logged in', async () => {
      const account = await accountWithPhone();
      const otherSession = await request(server())
        .post('/v1/auth/log-in')
        .send({ username: account.username, password: account.password })
        .expect(200);
      await forgot(account.username).expect(202);

      const res = await reset(
        account.username.toUpperCase(),
        sms.last().code,
      ).expect(200);
      expect(res.body.me.id).toBe(account.id);
      await request(server())
        .get('/v1/me')
        .set(...bearer(res.body.accessToken))
        .expect(200);

      await request(server())
        .post('/v1/auth/refresh')
        .send({ refreshToken: otherSession.body.refreshToken })
        .expect(401);
      await request(server())
        .post('/v1/auth/refresh')
        .send({ refreshToken: account.refreshToken })
        .expect(401);
      await request(server())
        .post('/v1/auth/refresh')
        .send({ refreshToken: res.body.refreshToken })
        .expect(200);
      await request(server())
        .post('/v1/auth/log-in')
        .send({ username: account.username, password: account.password })
        .expect(401);
      await request(server())
        .post('/v1/auth/log-in')
        .send({ username: account.username, password: 'fresh-pass-77' })
        .expect(200);
    });

    it('lifts a lockout', async () => {
      const account = await accountWithPhone();
      for (let i = 0; i < 5; i++) {
        await request(server())
          .post('/v1/auth/log-in')
          .send({ username: account.username, password: 'wrong-password' });
      }
      await forgot(account.username).expect(202);
      await reset(account.username, sms.last().code).expect(200);
      await request(server())
        .post('/v1/auth/log-in')
        .send({ username: account.username, password: 'fresh-pass-77' })
        .expect(200);
    });

    it('a code is single-use', async () => {
      const account = await accountWithPhone();
      await forgot(account.username).expect(202);
      const code = sms.last().code;
      await reset(account.username, code).expect(200);
      expect(
        (await reset(account.username, code, 'another-pass-88').expect(400))
          .body.code,
      ).toBe('CODE_INVALID');
    });

    it('CODE_INVALID, then CODE_ATTEMPTS on the third wrong try; a new code works', async () => {
      const account = await accountWithPhone();
      await forgot(account.username).expect(202);
      const code = sms.last().code;

      expect(
        (await reset(account.username, wrongCode(code)).expect(400)).body.code,
      ).toBe('CODE_INVALID');
      expect(
        (await reset(account.username, wrongCode(code)).expect(400)).body.code,
      ).toBe('CODE_INVALID');
      expect(
        (await reset(account.username, wrongCode(code)).expect(429)).body.code,
      ).toBe('CODE_ATTEMPTS');
      expect((await reset(account.username, code).expect(429)).body.code).toBe(
        'CODE_ATTEMPTS',
      );

      await ageCodes(account.id, 61_000);
      await forgot(account.username).expect(202);
      await reset(account.username, sms.last().code).expect(200);
    });

    it('CODE_EXPIRED after 5 minutes', async () => {
      const account = await accountWithPhone();
      await forgot(account.username).expect(202);
      await prisma.smsCode.updateMany({
        where: { userId: account.id, purpose: 'password_reset' },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      expect(
        (await reset(account.username, sms.last().code).expect(400)).body.code,
      ).toBe('CODE_EXPIRED');
    });

    it('a newer code voids the older one', async () => {
      const account = await accountWithPhone();
      await forgot(account.username).expect(202);
      const first = sms.last().code;
      await ageCodes(account.id, 61_000);
      await forgot(account.username).expect(202);
      const second = sms.last().code;
      if (first !== second) {
        expect(
          (await reset(account.username, first).expect(400)).body.code,
        ).toBe('CODE_INVALID');
      }
      await reset(account.username, second).expect(200);
    });

    it('CODE_INVALID for an unknown user (same as a wrong code)', async () => {
      expect((await reset('nobody_here', '123456').expect(400)).body.code).toBe(
        'CODE_INVALID',
      );
    });

    it('400 PASSWORD_WEAK for a weak new password, and the code is not spent', async () => {
      const account = await accountWithPhone();
      await forgot(account.username).expect(202);
      const code = sms.last().code;
      const res = await reset(account.username, code, '123456').expect(400);
      expect(res.body).toMatchObject({
        code: 'PASSWORD_WEAK',
        fieldErrors: { newPassword: ['tooCommon'] },
      });
      await reset(account.username, code).expect(200);
    });

    it('400 VALIDATION_FAILED for a malformed code', async () => {
      const res = await request(server())
        .post('/v1/auth/password/reset')
        .send({ username: 'x', code: '12', newPassword: 'fresh-pass-77' })
        .expect(400);
      expect(res.body.fieldErrors).toHaveProperty('code');
    });

    it('403 ACCOUNT_BLOCKED when the account was blocked after the code was sent', async () => {
      const account = await accountWithPhone();
      await forgot(account.username).expect(202);
      await prisma.user.update({
        where: { id: account.id },
        data: { blockedAt: new Date(), blockReasonCode: 'abuse' },
      });
      const res = await reset(account.username, sms.last().code).expect(403);
      expect(res.body).toMatchObject({
        code: 'ACCOUNT_BLOCKED',
        reasonCode: 'abuse',
      });
    });
  });

  describe('GET /v1/me', () => {
    it('200 with the documented fields only', async () => {
      const account = await signUp(app);
      const res = await request(server())
        .get('/v1/me')
        .set(...bearer(account.accessToken))
        .expect(200);
      expect(Object.keys(res.body).sort()).toEqual(
        [
          'createdAt',
          'hasRecoveryPhone',
          'id',
          'locale',
          'recoveryPhonePending',
          'role',
          'username',
        ].sort(),
      );
    });
  });

  describe('POST /v1/me/guest-merge (AC8)', () => {
    const merge = (account: Account, body: Record<string, unknown>) =>
      request(server())
        .post('/v1/me/guest-merge')
        .set(...bearer(account.accessToken))
        .send(body);

    it('200: merges the app language into the account; unhandled parts are reported as skipped', async () => {
      const account = await signUp(app, { locale: 'en' });
      const res = await merge(account, {
        locale: 'uz',
        onboarding: { experience: 'beginner' },
      }).expect(200);
      expect(res.body).toEqual({ merged: ['locale'], skipped: ['onboarding'] });
      const me = await request(server())
        .get('/v1/me')
        .set(...bearer(account.accessToken))
        .expect(200);
      expect(me.body.locale).toBe('uz');
    });

    it('is safe to repeat and accepts an empty body', async () => {
      const account = await signUp(app);
      await merge(account, { locale: 'ru' }).expect(200);
      await merge(account, { locale: 'ru' }).expect(200);
      expect((await merge(account, {}).expect(200)).body).toEqual({
        merged: [],
        skipped: [],
      });
    });

    it('400 VALIDATION_FAILED for an unknown locale or unknown field', async () => {
      const account = await signUp(app);
      expect(
        (await merge(account, { locale: 'de' }).expect(400)).body.code,
      ).toBe('VALIDATION_FAILED');
      await merge(account, { xp: 100 }).expect(400);
    });

    it('401 without a token', async () => {
      await request(server()).post('/v1/me/guest-merge').send({}).expect(401);
    });
  });
});

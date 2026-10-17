import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { vi } from 'vitest';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import {
  SmsSender,
  type SmsMessage,
} from '../../src/features/auth/sms-sender.js';

/** A password that passes the policy. Synthetic. */
export const GOOD_PASSWORD = 'tiger-lily-42';

export interface Account {
  id: string;
  username: string;
  password: string;
  accessToken: string;
  refreshToken: string;
}

let counter = 0;
export function uniqueName(prefix = 'guest'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter}`.slice(0, 20);
}

export async function signUp(
  app: NestExpressApplication,
  overrides: Record<string, unknown> = {},
): Promise<Account> {
  const username = (overrides.username as string | undefined) ?? uniqueName();
  const password = (overrides.password as string | undefined) ?? GOOD_PASSWORD;
  const res = await request(app.getHttpServer())
    .post('/v1/auth/sign-up')
    .send({ username, password, locale: 'en', acceptTerms: true, ...overrides })
    .expect(201);
  return {
    id: res.body.me.id,
    username: res.body.me.username,
    password,
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
  };
}

export async function makeAdmin(
  app: NestExpressApplication,
  overrides: Record<string, unknown> = {},
): Promise<Account> {
  const account = await signUp(app, overrides);
  await app
    .get(PrismaService)
    .user.update({ where: { id: account.id }, data: { role: 'admin' } });
  return account;
}

export const bearer = (token: string): [string, string] => [
  'Authorization',
  `Bearer ${token}`,
];

/** Records every SMS the app "sends" so a test can read the code. */
export function captureSms(app: NestExpressApplication): {
  all: SmsMessage[];
  last: () => SmsMessage;
  clear: () => void;
} {
  const all: SmsMessage[] = [];
  const sender = app.get(SmsSender);
  const original = sender.send.bind(sender);
  vi.spyOn(sender, 'send').mockImplementation(async (message) => {
    all.push(message);
    await original(message);
  });
  return {
    all,
    last: () => {
      const message = all[all.length - 1];
      if (!message) throw new Error('No SMS was sent');
      return message;
    },
    clear: () => {
      all.length = 0;
    },
  };
}

/** Moves a code / attempt / token into the past so time rules can be tested without waiting. */
export async function resetAttempts(
  app: NestExpressApplication,
): Promise<void> {
  await app.get(PrismaService).loginAttempt.deleteMany();
}

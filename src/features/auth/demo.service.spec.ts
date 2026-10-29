import type { AppConfig } from '../../config/app-config.js';
import type { GameConfigService } from '../levels/game-config.service.js';
import { NotDemoError, UsernameTakenError } from './auth.errors.js';
import type { AuthRepository, UserRecord } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { demoUsername } from './demo.rules.js';
import type { MeService } from './me.service.js';
import type { PasswordService } from './password.service.js';
import type { RecoveryService } from './recovery.service.js';
import type { TokenService } from './token.service.js';

const GOOD_PASSWORD = 'tiger-lily-42';

function setup(options: { takenTimes?: number; isDemo?: boolean } = {}) {
  const tried: string[] = [];
  const secured: { username: string; passwordHash: string }[] = [];
  let taken = options.takenTimes ?? 0;
  const repository = {
    demoCreationTimes: () => Promise.resolve([]),
    createDemoUser: (data: { username: string }) => {
      tried.push(data.username);
      if (taken > 0) {
        taken -= 1;
        return Promise.reject(new UsernameTakenError());
      }
      return Promise.resolve({ id: 'user_1', ...data } as UserRecord);
    },
    findById: () =>
      Promise.resolve({ id: 'user_1', isDemo: options.isDemo ?? true }),
    secureDemoUser: (_id: string, username: string, passwordHash: string) => {
      secured.push({ username, passwordHash });
      return Promise.resolve(true);
    },
  };
  const passwords = {
    hash: (password: string) => Promise.resolve(`hash:${password}`),
    assertAcceptable: () => undefined,
  };
  const tokens = {
    startSession: () =>
      Promise.resolve({ accessToken: 'a', refreshToken: 'r', expiresIn: 900 }),
  };
  const me = {
    toMe: () => Promise.resolve({}),
    getMe: () => Promise.resolve({ isDemo: false }),
  };
  const gameConfig = {
    checkInConfig: () => Promise.resolve({ demoPerIpPerDay: 5 }),
  };
  const service = new AuthService(
    repository as unknown as AuthRepository,
    passwords as unknown as PasswordService,
    tokens as unknown as TokenService,
    {} as RecoveryService,
    me as unknown as MeService,
    gameConfig as unknown as GameConfigService,
    { jwtAccessSecret: 'test-secret' } as AppConfig,
  );
  return { service, tried, secured };
}

describe('demo username (ADR-006)', () => {
  it('uses 4 digits for the first 5 tries, then 6 digits', () => {
    expect(demoUsername(0)).toMatch(/^explorer_\d{4}$/);
    expect(demoUsername(4)).toMatch(/^explorer_\d{4}$/);
    expect(demoUsername(5)).toMatch(/^explorer_\d{6}$/);
  });
});

describe('AuthService.createDemo (ADR-006)', () => {
  it('retries a taken username and switches to 6 digits after 5 collisions', async () => {
    const { service, tried } = setup({ takenTimes: 5 });
    await service.createDemo({ locale: 'en' }, '203.0.113.1');
    expect(tried).toHaveLength(6);
    expect(tried.slice(0, 5).every((u) => /^explorer_\d{4}$/.test(u))).toBe(
      true,
    );
    expect(tried[5]).toMatch(/^explorer_\d{6}$/);
  });

  it('gives up with USERNAME_TAKEN when every try collides', async () => {
    const { service, tried } = setup({ takenTimes: 100 });
    await expect(
      service.createDemo({ locale: 'en' }, '203.0.113.1'),
    ).rejects.toBeInstanceOf(UsernameTakenError);
    expect(tried).toHaveLength(10);
  });
});

describe('AuthService.secure (ADR-006)', () => {
  it('stores the normalized username and a password hash', async () => {
    const { service, secured } = setup();
    await service.secure('user_1', {
      username: 'Guest_1',
      password: GOOD_PASSWORD,
    });
    expect(secured).toEqual([
      { username: 'guest_1', passwordHash: `hash:${GOOD_PASSWORD}` },
    ]);
  });

  it('refuses a user that is not a demo with NOT_DEMO', async () => {
    const { service, secured } = setup({ isDemo: false });
    await expect(
      service.secure('user_1', {
        username: 'guest_1',
        password: GOOD_PASSWORD,
      }),
    ).rejects.toBeInstanceOf(NotDemoError);
    expect(secured).toEqual([]);
  });
});

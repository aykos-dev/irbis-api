import { loadCommonPasswords } from './common-passwords.js';
import {
  CODE_MAX_ATTEMPTS,
  CODE_RESEND_MS,
  CODE_TTL_MS,
  checkCode,
  codeMatches,
  generateCode,
  hashCode,
  sendDecision,
} from './code.rules.js';
import {
  IP_MAX_FAILURES,
  LOCKOUT_MAX_FAILURES,
  LOCKOUT_WINDOW_MS,
  ipThrottle,
  usernameLockout,
} from './lockout.rules.js';
import { passwordProblem } from './password.rules.js';
import { maskPhone, normalizePhone } from './phone.rules.js';
import { classifyRefresh } from './refresh.rules.js';
import { normalizeUsername, usernameProblem } from './username.rules.js';

const T0 = new Date('2026-10-17T10:00:00Z');
const after = (ms: number): Date => new Date(T0.getTime() + ms);

describe('username rules (AC3)', () => {
  it.each([
    ['abc', null],
    ['guest_1', null],
    ['a.b_c9', null],
    ['a'.repeat(20), null],
    ['ab', 'tooShort'],
    ['a'.repeat(21), 'tooLong'],
    ['bad name', 'badCharacters'],
    ['name!', 'badCharacters'],
    ['.abc', 'dotAtEdge'],
    ['abc.', 'dotAtEdge'],
    ['admin', 'reserved'],
    ['irbis', 'reserved'],
    ['support', 'reserved'],
    ['moderator', 'reserved'],
    ['root', 'reserved'],
    ['system', 'reserved'],
    ['official', 'reserved'],
    ['ad.min', 'reserved'],
    ['support_', 'reserved'],
    ['admin1', null],
  ])('%s -> %s', (name, problem) => {
    expect(usernameProblem(normalizeUsername(name))).toBe(problem);
  });

  it('is case-insensitive: input is lowercased', () => {
    expect(normalizeUsername('Guest_1')).toBe('guest_1');
    expect(usernameProblem(normalizeUsername('ADMIN'))).toBe('reserved');
  });
});

describe('password policy (AC3)', () => {
  const common = new Set(['password', 'qwerty123']);

  it.each([
    ['12345', 'tooShort'],
    ['abcdef', null],
    ['x'.repeat(64), null],
    ['x'.repeat(65), 'tooLong'],
    ['Guest_1', 'sameAsUsername'],
    ['PASSWORD', 'tooCommon'],
    ['correct horse', null],
  ])('%s -> %s', (password, problem) => {
    expect(passwordProblem(password, 'guest_1', common)).toBe(problem);
  });

  it('ships the SecLists 10k list with its licence line', () => {
    const list = loadCommonPasswords();
    expect(list.size).toBeGreaterThan(9_000);
    expect(list.has('123456')).toBe(true);
    expect(list.has('# licence')).toBe(false);
  });
});

describe('phone rules', () => {
  it('accepts +998 and 9 digits, ignoring separators', () => {
    expect(normalizePhone('+998 90 123-45-67')).toBe('+998901234567');
    expect(normalizePhone('+998 (90) 1234567')).toBe('+998901234567');
  });

  it.each([
    '998901234567',
    '+99890123456',
    '+9989012345678',
    '+7999123456',
    'abc',
    '',
  ])('rejects %s', (raw) => expect(normalizePhone(raw)).toBeNull());

  it('masks all but the last two digits', () => {
    expect(maskPhone('+998901234567')).toBe('+998 •• ••• •• 67');
  });
});

describe('lockout timing (AC4)', () => {
  const fail = (offsetsMs: number[]): Date[] => offsetsMs.map(after);

  it('does not lock after 4 wrong passwords', () => {
    expect(
      usernameLockout(fail([0, 1000, 2000, 3000]), after(4000)).limited,
    ).toBe(false);
  });

  it('locks at the 5th for 15 minutes from the latest failure', () => {
    const state = usernameLockout(
      fail([0, 1000, 2000, 3000, 4000]),
      after(4000),
    );
    expect(state).toEqual({
      limited: true,
      retryAfterSec: LOCKOUT_WINDOW_MS / 1000,
    });
    expect(
      usernameLockout(fail([0, 1000, 2000, 3000, 4000]), after(4000 + 60_000))
        .retryAfterSec,
    ).toBe(840);
  });

  it('unlocks once 15 minutes passed since the latest failure', () => {
    const failures = fail([0, 1000, 2000, 3000, 4000]);
    expect(
      usernameLockout(failures, after(4000 + LOCKOUT_WINDOW_MS)).limited,
    ).toBe(false);
  });

  it('ignores failures older than the window', () => {
    const failures = fail([0, 1000, 2000, 3000, LOCKOUT_WINDOW_MS + 10]);
    expect(
      usernameLockout(failures, after(LOCKOUT_WINDOW_MS + 10)).limited,
    ).toBe(false);
  });

  it('uses the documented thresholds', () => {
    expect(LOCKOUT_MAX_FAILURES).toBe(5);
    expect(LOCKOUT_WINDOW_MS).toBe(15 * 60_000);
  });

  it('throttles an IP after too many failures across usernames and releases as they age out', () => {
    const failures = Array.from({ length: IP_MAX_FAILURES }, (_, i) =>
      after(i * 1000),
    );
    const blocked = ipThrottle(failures, after(20_000));
    expect(blocked.limited).toBe(true);
    expect(blocked.retryAfterSec).toBe(LOCKOUT_WINDOW_MS / 1000 - 20 + 0);
    expect(ipThrottle(failures.slice(1), after(20_000)).limited).toBe(false);
  });
});

describe('SMS code rules (AC5)', () => {
  const fresh = { usedAt: null, attempts: 0, expiresAt: after(CODE_TTL_MS) };

  it('generates 6 digits, zero padded', () => {
    for (let i = 0; i < 50; i++) expect(generateCode()).toMatch(/^\d{6}$/);
  });

  it('binds the hash to user, purpose and code', () => {
    const base = hashCode('secret', 'u1', 'password_reset', '123456');
    expect(
      codeMatches(base, hashCode('secret', 'u1', 'password_reset', '123456')),
    ).toBe(true);
    expect(
      codeMatches(base, hashCode('secret', 'u2', 'password_reset', '123456')),
    ).toBe(false);
    expect(
      codeMatches(base, hashCode('secret', 'u1', 'phone_verify', '123456')),
    ).toBe(false);
    expect(
      codeMatches(base, hashCode('secret', 'u1', 'password_reset', '123457')),
    ).toBe(false);
  });

  it('accepts a correct code inside 5 minutes', () => {
    expect(checkCode(fresh, true, after(CODE_TTL_MS - 1))).toEqual({
      verdict: 'ok',
      countAttempt: false,
    });
  });

  it('expires at 5 minutes', () => {
    expect(checkCode(fresh, true, after(CODE_TTL_MS)).verdict).toBe('expired');
  });

  it('counts wrong tries and voids the code on the 3rd', () => {
    expect(checkCode(fresh, false, T0)).toEqual({
      verdict: 'invalid',
      countAttempt: true,
    });
    expect(checkCode({ ...fresh, attempts: 1 }, false, T0)).toEqual({
      verdict: 'invalid',
      countAttempt: true,
    });
    expect(checkCode({ ...fresh, attempts: 2 }, false, T0)).toEqual({
      verdict: 'attempts',
      countAttempt: true,
    });
    expect(CODE_MAX_ATTEMPTS).toBe(3);
  });

  it('refuses even the right code once tries are used up, and a used code', () => {
    expect(checkCode({ ...fresh, attempts: 3 }, true, T0).verdict).toBe(
      'attempts',
    );
    expect(checkCode({ ...fresh, usedAt: T0 }, true, T0).verdict).toBe(
      'invalid',
    );
  });

  it('allows a resend after 60 s and at most 5 codes a day', () => {
    expect(sendDecision(null, 0, T0)).toBe('send');
    expect(sendDecision(T0, 1, after(CODE_RESEND_MS - 1))).toBe('cooldown');
    expect(sendDecision(T0, 1, after(CODE_RESEND_MS))).toBe('send');
    expect(sendDecision(T0, 5, after(CODE_RESEND_MS * 10))).toBe('daily_limit');
    expect(sendDecision(null, 4, T0)).toBe('send');
  });
});

describe('refresh token rules (AC9)', () => {
  const live = { expiresAt: after(1000), revokedAt: null, replacedById: null };

  it('accepts a live token', () => {
    expect(classifyRefresh(live, T0)).toBe('ok');
  });

  it('rejects unknown and expired tokens', () => {
    expect(classifyRefresh(null, T0)).toBe('invalid');
    expect(classifyRefresh(live, after(1000))).toBe('invalid');
  });

  it('flags a rotated token that is presented again as reuse', () => {
    expect(
      classifyRefresh({ ...live, revokedAt: T0, replacedById: 'next' }, T0),
    ).toBe('reused');
  });

  it('treats a token revoked by sign-out, block or reset as plainly invalid', () => {
    expect(classifyRefresh({ ...live, revokedAt: T0 }, T0)).toBe('invalid');
  });
});

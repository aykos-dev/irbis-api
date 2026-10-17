import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 5 * 60_000;
export const CODE_RESEND_MS = 60_000;
export const CODE_RESEND_SEC = CODE_RESEND_MS / 1000;
export const CODE_MAX_ATTEMPTS = 3;
export const CODE_MAX_PER_DAY = 5;
export const CODE_DAY_MS = 24 * 3_600_000;

export function generateCode(): string {
  return randomInt(0, 10 ** CODE_LENGTH)
    .toString()
    .padStart(CODE_LENGTH, '0');
}

/** HMAC so a leaked table does not hand out 6-digit codes; bound to the user and purpose. */
export function hashCode(
  secret: string | Buffer,
  userId: string,
  purpose: string,
  code: string,
): string {
  return createHmac('sha256', secret)
    .update(`${userId}:${purpose}:${code}`)
    .digest('hex');
}

export function codeMatches(expectedHash: string, actualHash: string): boolean {
  const a = Buffer.from(expectedHash, 'hex');
  const b = Buffer.from(actualHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export type CodeVerdict = 'ok' | 'invalid' | 'expired' | 'attempts';

export interface CodeState {
  usedAt: Date | null;
  attempts: number;
  expiresAt: Date;
}

export interface CodeCheck {
  verdict: CodeVerdict;
  /** True when this try must be added to the code's attempt counter. */
  countAttempt: boolean;
}

/**
 * Decides one submission against the newest code of a user: single use, 5 min expiry,
 * 3 wrong tries void it (the third wrong try already answers `attempts`).
 */
export function checkCode(
  state: CodeState,
  matches: boolean,
  now: Date,
): CodeCheck {
  if (state.usedAt) return { verdict: 'invalid', countAttempt: false };
  if (state.expiresAt.getTime() <= now.getTime()) {
    return { verdict: 'expired', countAttempt: false };
  }
  if (state.attempts >= CODE_MAX_ATTEMPTS) {
    return { verdict: 'attempts', countAttempt: false };
  }
  if (matches) return { verdict: 'ok', countAttempt: false };
  return {
    verdict: state.attempts + 1 >= CODE_MAX_ATTEMPTS ? 'attempts' : 'invalid',
    countAttempt: true,
  };
}

export type SendDecision = 'send' | 'cooldown' | 'daily_limit';

/** Resend after 60 s, at most 5 codes per account in 24 h. */
export function sendDecision(
  lastCreatedAt: Date | null,
  createdInLastDay: number,
  now: Date,
): SendDecision {
  if (createdInLastDay >= CODE_MAX_PER_DAY) return 'daily_limit';
  if (
    lastCreatedAt &&
    now.getTime() - lastCreatedAt.getTime() < CODE_RESEND_MS
  ) {
    return 'cooldown';
  }
  return 'send';
}

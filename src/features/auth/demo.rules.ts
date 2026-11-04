import { createHmac, randomInt } from 'node:crypto';
import { usernameProblem } from './username.rules.js';

/** Collisions on 4-digit names before switching to 6 digits. */
export const DEMO_SHORT_ATTEMPTS = 5;
/** Total tries before giving up (the last error is surfaced). */
export const DEMO_MAX_ATTEMPTS = 10;
export const DEMO_WINDOW_MS = 24 * 3_600_000;

/** `explorer_<4 digits>` for the first tries, `explorer_<6 digits>` after 5 collisions. */
export function demoUsername(
  attempt: number,
  random: (min: number, max: number) => number = randomInt,
): string {
  const digits =
    attempt < DEMO_SHORT_ATTEMPTS
      ? random(1_000, 10_000)
      : random(100_000, 1_000_000);
  const username = `explorer_${digits}`;
  if (usernameProblem(username)) {
    throw new Error(`Generated demo username breaks the rules: ${username}`);
  }
  return username;
}

/** Keyed hash so the demo limit never stores or logs a raw IP. */
export function hashDemoIp(secret: string, ip: string): string {
  return createHmac('sha256', secret).update(`demo-ip:${ip}`).digest('hex');
}

/** Seconds until the oldest creation in the window leaves it. */
export function demoRetryAfterSec(oldest: Date, now: Date): number {
  return Math.max(
    1,
    Math.ceil((oldest.getTime() + DEMO_WINDOW_MS - now.getTime()) / 1000),
  );
}

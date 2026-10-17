export const LOCKOUT_MAX_FAILURES = 5;
export const LOCKOUT_WINDOW_MS = 15 * 60_000;
/** Wrong passwords from one IP (any usernames) inside the window before it is refused. */
export const IP_MAX_FAILURES = 20;

export interface LimitState {
  limited: boolean;
  retryAfterSec: number;
}

const NOT_LIMITED: LimitState = { limited: false, retryAfterSec: 0 };

function inWindow(failures: readonly Date[], now: Date): Date[] {
  const since = now.getTime() - LOCKOUT_WINDOW_MS;
  return failures
    .filter((at) => at.getTime() > since)
    .sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Per-username lockout: `LOCKOUT_MAX_FAILURES` wrong passwords inside the window lock the
 * username until `LOCKOUT_WINDOW_MS` after the latest one. Pass failures recorded since the
 * last successful log-in; attempts made while locked must not be recorded (they would extend it).
 */
export function usernameLockout(
  failures: readonly Date[],
  now: Date,
): LimitState {
  const recent = inWindow(failures, now);
  if (recent.length < LOCKOUT_MAX_FAILURES) return NOT_LIMITED;
  const latest = recent[recent.length - 1].getTime();
  return toState(latest + LOCKOUT_WINDOW_MS, now);
}

/** Per-IP throttle: blocked until enough old failures age out to drop below the limit. */
export function ipThrottle(failures: readonly Date[], now: Date): LimitState {
  const recent = inWindow(failures, now);
  if (recent.length < IP_MAX_FAILURES) return NOT_LIMITED;
  const mustExpire = recent[recent.length - IP_MAX_FAILURES].getTime();
  return toState(mustExpire + LOCKOUT_WINDOW_MS, now);
}

function toState(untilMs: number, now: Date): LimitState {
  const remainingMs = untilMs - now.getTime();
  return remainingMs > 0
    ? { limited: true, retryAfterSec: Math.ceil(remainingMs / 1000) }
    : NOT_LIMITED;
}

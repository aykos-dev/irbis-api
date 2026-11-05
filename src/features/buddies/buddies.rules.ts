import {
  MENTOR_LEVEL,
  NEAR_LEVEL_SPREAD,
  RATING_MIN_RATERS,
  RATING_WINDOW_DAYS,
  type BuddyLevelFilter,
} from './buddies.constants.js';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
/** Asia/Tashkent is UTC+5 all year. */
const TASHKENT_OFFSET_MS = 5 * HOUR_MS;

/** The Monday (Asia/Tashkent) of the week containing `now`, as a UTC-midnight date value. */
export function tashkentWeekStart(now: Date): Date {
  const local = new Date(now.getTime() + TASHKENT_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  const sinceMonday = (local.getUTCDay() + 6) % 7;
  return new Date(local.getTime() - sinceMonday * DAY_MS);
}

/** YYYY-MM-DD of a date value. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** One key per unordered pair, so the unique index blocks a second link either way. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/** Inclusive level bounds for a filter, relative to the caller's level. */
export function levelRange(
  filter: BuddyLevelFilter,
  myLevel: number,
): { min?: number; max?: number } {
  if (filter === 'near') {
    return {
      min: myLevel - NEAR_LEVEL_SPREAD,
      max: myLevel + NEAR_LEVEL_SPREAD,
    };
  }
  if (filter === 'mentors') return { min: MENTOR_LEVEL };
  return {};
}

export interface CandidateSortKey {
  id: string;
  level: number;
  lastActiveAt: Date;
  free: boolean;
  /** Null when hidden (fewer than RATING_MIN_RATERS raters). */
  ratingMean: number | null;
}

/**
 * AC2 order: free this week first, closest level, best rating (hidden last), most recently
 * active, then id for a stable page boundary.
 */
export function compareCandidates(
  myLevel: number,
): (a: CandidateSortKey, b: CandidateSortKey) => number {
  return (a, b) => {
    if (a.free !== b.free) return a.free ? -1 : 1;
    const gap = Math.abs(a.level - myLevel) - Math.abs(b.level - myLevel);
    if (gap !== 0) return gap;
    if (a.ratingMean !== b.ratingMean) {
      if (a.ratingMean === null) return 1;
      if (b.ratingMean === null) return -1;
      return b.ratingMean - a.ratingMean;
    }
    const active = b.lastActiveAt.getTime() - a.lastActiveAt.getTime();
    if (active !== 0) return active;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  };
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface RatingAggregate {
  raters: number;
  trips: number;
  reliable: number;
  safety: number;
  company: number;
}

export interface RatingSummary {
  reliable: number;
  safety: number;
  company: number;
  raters: number;
  trips: number;
}

/** AC8: per-trait means to 1 decimal; null below RATING_MIN_RATERS distinct raters. */
export function ratingSummary(
  aggregate: RatingAggregate | undefined,
): RatingSummary | null {
  if (!aggregate || aggregate.raters < RATING_MIN_RATERS) return null;
  return {
    reliable: round1(aggregate.reliable),
    safety: round1(aggregate.safety),
    company: round1(aggregate.company),
    raters: aggregate.raters,
    trips: aggregate.trips,
  };
}

/** The card's single star: mean of the three trait means, or null while hidden. */
export function overallMean(
  aggregate: RatingAggregate | undefined,
): number | null {
  if (!aggregate || aggregate.raters < RATING_MIN_RATERS) return null;
  return round1(
    (aggregate.reliable + aggregate.safety + aggregate.company) / 3,
  );
}

/** AC7: rating closes 7 days after the trip's backBy. */
export function ratingClosesAt(backBy: Date): Date {
  return new Date(backBy.getTime() + RATING_WINDOW_DAYS * DAY_MS);
}

/** Opaque find cursor: the offset into the sorted list. */
export function parseOffset(
  payload: Record<string, unknown> | null,
): number | null {
  const offset = payload?.offset;
  return typeof offset === 'number' && Number.isInteger(offset) && offset >= 0
    ? offset
    : null;
}

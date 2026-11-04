import type { ConditionStatusCode } from '../conditions/conditions.constants.js';

/** 12:00 Asia/Tashkent every Saturday and Sunday: the weather-shield snapshot (features/streaks.md AC3). */
export const WEEKEND_CONDITIONS_CRON = '0 12 * * 6,0';
export const WEEKEND_CONDITIONS_TIME_ZONE = 'Asia/Tashkent';
export const WEEKEND_CONDITIONS_JOB_NAME = 'weekend-conditions';

/** Statuses that make a weekend day "red" for the shield. */
export const SHIELD_STATUSES: ReadonlySet<ConditionStatusCode> = new Set([
  'not_now',
  'seasonal_lock',
]);

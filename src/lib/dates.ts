const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
/** Uzbekistan has no daylight saving: Asia/Tashkent is UTC+5 all year. */
const TASHKENT_OFFSET_MS = 5 * HOUR_MS;

/** Start (00:00 Asia/Tashkent) of the Tashkent calendar day containing `now`, as a UTC instant. */
export function startOfTashkentDay(now: Date): Date {
  const local = new Date(now.getTime() + TASHKENT_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - TASHKENT_OFFSET_MS);
}

export function minusDays(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

export function addMs(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

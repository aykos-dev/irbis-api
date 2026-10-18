import { startOfTashkentDay } from '../../lib/dates.js';
import type { WeekendDayName } from './conditions.constants.js';

const DAY_MS = 86_400_000;
const TASHKENT_OFFSET_MS = 5 * 3_600_000;
const SATURDAY = 6;
const SUNDAY = 0;

export interface WindowDay {
  date: string;
  day: WeekendDayName;
}

/** Midnight of the Tashkent day as a UTC-labelled date, so getUTC* read Tashkent calendar fields. */
function tashkentCalendar(now: Date): Date {
  return new Date(startOfTashkentDay(now).getTime() + TASHKENT_OFFSET_MS);
}

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

/** Tashkent calendar date (YYYY-MM-DD) of `now`. */
export function tashkentDate(now: Date): string {
  return isoDate(tashkentCalendar(now));
}

/** Tashkent calendar month of `now`, 1–12. */
export function tashkentMonth(now: Date): number {
  return tashkentCalendar(now).getUTCMonth() + 1;
}

/** Weekend window by Tashkent date: Mon–Fri → coming Sat + Sun; Sat → Sat + Sun; Sun → Sun. */
export function weekendWindow(now: Date): WindowDay[] {
  const today = tashkentCalendar(now);
  const weekday = today.getUTCDay();
  if (weekday === SUNDAY) {
    return [{ date: isoDate(today), day: 'sun' }];
  }
  const saturday = new Date(today.getTime() + (SATURDAY - weekday) * DAY_MS);
  return [
    { date: isoDate(saturday), day: 'sat' },
    { date: isoDate(new Date(saturday.getTime() + DAY_MS)), day: 'sun' },
  ];
}

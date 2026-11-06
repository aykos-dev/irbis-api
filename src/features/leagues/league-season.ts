import type { LeagueConfig } from './leagues.config.js';

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface LeagueSeasonWindow {
  key: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  settlesAt: Date;
}

function tashkentParts(at: Date): { year: number; month: number } {
  const local = new Date(at.getTime() + TASHKENT_OFFSET_MS);
  return { year: local.getUTCFullYear(), month: local.getUTCMonth() };
}

function tashkentMidnightUtc(year: number, month: number, day = 1): Date {
  return new Date(Date.UTC(year, month, day) - TASHKENT_OFFSET_MS);
}

export function leagueSeasonAt(
  at: Date,
  config: LeagueConfig,
): LeagueSeasonWindow {
  const { year, month } = tashkentParts(at);
  let baseYear = year;
  let startMonth: number;
  let nextMonth: number;
  let nextYear = year;
  let slug: string;
  let name: string;

  if (month <= 1) {
    baseYear = year - 1;
    startMonth = 11;
    nextMonth = 2;
    slug = 'winter';
    name = `Winter ${baseYear}–${String(year).slice(-2)}`;
  } else if (month <= 4) {
    startMonth = 2;
    nextMonth = 5;
    slug = 'spring';
    name = `Spring ${year}`;
  } else if (month <= 7) {
    startMonth = 5;
    nextMonth = 8;
    slug = 'summer';
    name = `Summer ${year}`;
  } else if (month <= 10) {
    startMonth = 8;
    nextMonth = 11;
    slug = 'autumn';
    name = `Autumn ${year}`;
  } else {
    startMonth = 11;
    nextMonth = 2;
    nextYear = year + 1;
    slug = 'winter';
    name = `Winter ${year}–${String(nextYear).slice(-2)}`;
  }

  const startsAt = tashkentMidnightUtc(baseYear, startMonth);
  const endsAt = tashkentMidnightUtc(nextYear, nextMonth);
  return {
    key: `${baseYear}-${slug}`,
    name,
    startsAt,
    endsAt,
    settlesAt: new Date(endsAt.getTime() + config.settlementHours * HOUR_MS),
  };
}

export function nextLeagueSeason(
  window: LeagueSeasonWindow,
  config: LeagueConfig,
): LeagueSeasonWindow {
  return leagueSeasonAt(new Date(window.endsAt.getTime() + HOUR_MS), config);
}

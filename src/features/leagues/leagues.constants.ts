export const LEAGUE_TIERS = [
  'scout',
  'tracker',
  'ranger',
  'vanguard',
  'legend',
] as const;
export type LeagueTierCode = (typeof LEAGUE_TIERS)[number];

export const LEAGUE_OUTCOMES = [
  'champion',
  'promoted',
  'stayed',
  'demoted',
] as const;
export type LeagueOutcomeCode = (typeof LEAGUE_OUTCOMES)[number];

export const LEAGUE_MEDALS = ['gold', 'silver', 'bronze'] as const;
export type LeagueMedalCode = (typeof LEAGUE_MEDALS)[number];

export const LEAGUE_TIME_ZONE = 'Asia/Tashkent';
export const LEAGUE_CONFIG_KEY = 'leagues.config';

export const DEFAULT_LEAGUE_CONFIG = {
  startAt: '2026-11-05T00:00:00.000Z',
  settlementHours: 48,
  divisionCapacity: 15,
  xpThresholds: [0, 1000, 2500, 5000, 9000],
  movement: [
    { min: 10, promote: 5, demote: 3 },
    { min: 6, promote: 3, demote: 2 },
    { min: 2, promote: 1, demote: 1 },
  ],
} as const;

import type { HazardCode } from '../places/places.constants.js';

export const CONDITION_STATUSES = [
  'go',
  'caution',
  'not_now',
  'seasonal_lock',
] as const;
export type ConditionStatusCode = (typeof CONDITION_STATUSES)[number];

export const CONDITION_SOURCES = [
  'forecast',
  'hazard_rule',
  'closure',
  'season',
  'manual',
] as const;
export type ConditionSourceCode = (typeof CONDITION_SOURCES)[number];

export const REASON_CODES = [
  'THUNDERSTORM',
  'GUSTS',
  'HEAVY_PRECIP',
  'WIND',
  'PRECIP_LIKELY',
  'HEAT',
  'COLD',
  'MUDSLIDE_RISK',
  'FLOOD_RISK',
  'AVALANCHE_RISK',
  'GOOD_WEATHER',
  'OVERRIDE',
  'CLOSURE',
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export type WeekendDayName = 'sat' | 'sun';

export interface Reason {
  code: ReasonCode;
  day?: WeekendDayName;
  value?: number;
}

export const HAZARD_LEVELS = [
  'low',
  'raised',
  'high',
  'open',
  'closed',
] as const;

export type HazardLevelCode = (typeof HAZARD_LEVELS)[number];

export interface HazardLevel {
  hazard: HazardCode;
  level: HazardLevelCode;
}

/** One window day from the forecast; every number is rounded to an integer. */
export interface WeekendDay {
  date: string;
  day: WeekendDayName;
  weatherCode: number;
  tMaxC: number;
  tMinC: number;
  windKmh: number;
  gustKmh: number;
  precipMm: number;
  precipProbPct: number;
  snowCm: number;
}

/** WMO weather codes for thunderstorms (with or without hail). */
export const THUNDERSTORM_CODES: ReadonlySet<number> = new Set([95, 96, 99]);

export const MAX_REASONS = 3;

/** Open-Meteo daily variables, in request order. */
export const OPEN_METEO_DAILY = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'snowfall_sum',
] as const;
export type OpenMeteoDailyKey = (typeof OPEN_METEO_DAILY)[number];

export const OPEN_METEO_PAST_DAYS = 3;
export const OPEN_METEO_FORECAST_DAYS = 7;

/** Minute 5 of every hour, Asia/Tashkent. */
export const CONDITIONS_CRON = '5 * * * *';
export const CONDITIONS_TIME_ZONE = 'Asia/Tashkent';
export const CONDITIONS_JOB_NAME = 'conditions-forecast';

export const CLOSURE_SOURCES = ['official', 'admin'] as const;
export type ClosureSourceCode = (typeof CLOSURE_SOURCES)[number];

/** Admin list filter: a status, or `none` for places without one. */
export const ADMIN_STATUS_FILTERS = [...CONDITION_STATUSES, 'none'] as const;
export type AdminStatusFilter = (typeof ADMIN_STATUS_FILTERS)[number];

export const ADMIN_CONDITIONS_DEFAULT_LIMIT = 50;
export const ADMIN_CONDITIONS_MAX_LIMIT = 200;

/** Closure / override reason text, per language, after trimming. */
export const REASON_TEXT_MAX = 280;

/** An override must expire within this many days of its creation. */
export const OVERRIDE_MAX_DAYS = 14;

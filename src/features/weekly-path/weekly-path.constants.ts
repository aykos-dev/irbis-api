import type { InterestCode } from '../auth/auth.constants.js';
import type { PlaceTypeCode } from '../places/places.constants.js';

/** Which place types each onboarding interest stands for. */
export const INTEREST_TYPES: Record<InterestCode, readonly PlaceTypeCode[]> = {
  peaks: ['peak'],
  lakes: ['lake', 'waterfall'],
  caves: ['cave'],
  camping: ['camping'],
  trails: ['trail', 'canyon'],
};

export const WEATHER_DAYS = ['fri', 'sat', 'sun'] as const;
export type WeatherDayName = (typeof WEATHER_DAYS)[number];

/** PointForecast key of the weekend weather strip (the path origin). */
export const WEATHER_POINT_KEY = 'tashkent';

export const PATH_WEATHER_JOB_NAME = 'path-weather';

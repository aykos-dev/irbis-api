export const PLACE_TYPES = [
  'peak',
  'lake',
  'cave',
  'camping',
  'trail',
  'waterfall',
  'canyon',
] as const;
export type PlaceTypeCode = (typeof PLACE_TYPES)[number];

export const SEASON_STATUSES = ['best', 'possible', 'closed'] as const;
export type SeasonStatusCode = (typeof SEASON_STATUSES)[number];

export const HAZARDS = [
  'avalanche',
  'flood',
  'mudslide',
  'heat',
  'road',
] as const;
export type HazardCode = (typeof HAZARDS)[number];

export const PLACE_ORIGINS = ['device', 'tashkent'] as const;
export type PlaceOrigin = (typeof PLACE_ORIGINS)[number];

export const PLACES_DEFAULT_LIMIT = 50;

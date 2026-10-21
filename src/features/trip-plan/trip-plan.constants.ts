import type { PlaceTypeCode } from '../places/places.constants.js';

/** Mirrors the Prisma enum `TripStatus` (plain union so services stay Prisma-free). */
export const TRIP_STATUSES = [
  'planned',
  'active',
  'checked_out',
  'alerted',
] as const;
export type TripStatusCode = (typeof TRIP_STATUSES)[number];

export const GEAR_KEYS = [
  'water',
  'warmLayer',
  'firstAid',
  'offlineMap',
  'sun',
  'headlamp',
  'waterFilter',
] as const;
export type GearKey = (typeof GEAR_KEYS)[number];

export const GEAR_NOTES = ['frost', 'sunset', 'streams'] as const;
export type GearNote = (typeof GEAR_NOTES)[number];

/** Place types where streams are the usual refill, so a filter is suggested. */
export const WATER_FILTER_PLACE_TYPES: readonly PlaceTypeCode[] = [
  'lake',
  'trail',
  'camping',
];

/** GET /v1/trips/current keeps planned trips that started at most this long ago. */
export const PLANNED_TRIP_LOOKBACK_MS = 86_400_000;

export const NAME_MAX = 60;
export const RELATION_MAX = 30;
export const ACCURACY_MAX_M = 100_000;

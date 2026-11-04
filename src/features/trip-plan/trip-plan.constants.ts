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

/** AC8: the alert job stops retrying a trip after this many failed sends. */
export const ALERT_MAX_ATTEMPTS = 5;

/** Public live-page states (active-trip AC5). */
export const LIVE_TRIP_STATUSES = [
  'on_trip',
  'late',
  'alerted',
  'back_safe',
  'ended',
] as const;
export type LiveTripStatusCode = (typeof LIVE_TRIP_STATUSES)[number];

/** Trip statuses that have a live link. */
export const LIVE_LINK_STATUSES: readonly TripStatusCode[] = [
  'active',
  'alerted',
  'checked_out',
];

/** Trip statuses that accept location pings. */
export const PING_STATUSES: TripStatusCode[] = ['active', 'alerted'];

/** Live token: base64url of this many random bytes (22 characters). */
export const LIVE_TOKEN_BYTES = 16;
export const LIVE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export const PING_ACCURACY_MAX_M = 5000;
export const DISTANCE_MAX_M = 1_000_000;
export const CLIMB_MAX_M = 20_000;

/** A ping may be stamped at most this far ahead of the server clock. */
export const PING_FUTURE_SKEW_MS = 120_000;

import { RequestValidationError } from '../../common/errors/validation.error.js';
import { tashkentDate } from '../conditions/weekend-window.js';
import type { CheckInConfig } from '../levels/game-config.schema.js';
import { haversineM } from '../places/place.rules.js';
import type { PlaceTypeCode } from '../places/places.constants.js';
import {
  CheckInTooFarError,
  CheckInTooOldError,
  LocationInaccurateError,
} from './check-in.errors.js';

const HOUR_MS = 3_600_000;
/** Client clocks run a little fast: a fix up to 2 min ahead of the server is accepted. */
export const CHECK_IN_FUTURE_SKEW_MS = 2 * 60_000;

export interface CheckInFix {
  lat: number;
  lng: number;
  accuracyM: number;
}

export interface CheckInPlace {
  type: PlaceTypeCode;
  latitude: number;
  longitude: number;
}

/** AC3: future fixes are invalid input (400); fixes older than `maxAgeHours` are too old (422). */
export function assertRecordedAtAllowed(
  recordedAt: Date,
  now: Date,
  config: Pick<CheckInConfig, 'maxAgeHours'>,
): void {
  if (recordedAt.getTime() > now.getTime() + CHECK_IN_FUTURE_SKEW_MS) {
    throw new RequestValidationError({ recordedAt: ['notInFuture'] });
  }
  if (recordedAt.getTime() < now.getTime() - config.maxAgeHours * HOUR_MS) {
    throw new CheckInTooOldError();
  }
}

/** AC2: accuracy first, then the distance to the place against the radius of its type. */
export function assertFixAtPlace(
  fix: CheckInFix,
  place: CheckInPlace,
  config: Pick<CheckInConfig, 'maxAccuracyM' | 'radiusMByType'>,
): void {
  if (fix.accuracyM > config.maxAccuracyM) throw new LocationInaccurateError();
  const radiusM = config.radiusMByType[place.type];
  const distanceM = haversineM(fix, {
    lat: place.latitude,
    lng: place.longitude,
  });
  if (distanceM > radiusM) throw new CheckInTooFarError(distanceM, radiusM);
}

/** XP for a counted check-in at a place of `difficulty` 1–5. */
export function checkInXp(
  difficulty: number,
  config: Pick<CheckInConfig, 'xpByDifficulty'>,
): number {
  const xp = config.xpByDifficulty[difficulty - 1];
  if (xp === undefined)
    throw new Error(`No check-in XP for difficulty ${difficulty}`);
  return xp;
}

/** Asia/Tashkent calendar month (YYYY-MM) of `at`: one counted check-in per place per month. */
export function checkInMonth(at: Date): string {
  return tashkentDate(at).slice(0, 7);
}

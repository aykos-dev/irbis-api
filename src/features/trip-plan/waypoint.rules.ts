import type { TripActiveConfig } from '../levels/game-config.schema.js';
import { haversineM } from '../places/place.rules.js';
import {
  LocationInaccurateError,
  WaypointLimitError,
  WaypointTooCloseError,
  WaypointTooSoonError,
} from './trip-plan.errors.js';
import type { TripWaypointRecord } from './trip-plan.repository.js';

const MINUTE_MS = 60_000;

export interface WaypointFix {
  lat: number;
  lng: number;
  accuracyM: number;
  recordedAt: Date;
}

/**
 * AC6: throws the first rule the fix breaks, in order: accuracy, per-trip limit, distance from
 * ANY earlier waypoint, gap after the previous one. `earlier` is ordered by n.
 */
export function assertWaypointAllowed(
  fix: WaypointFix,
  earlier: readonly TripWaypointRecord[],
  rules: TripActiveConfig['waypoint'],
): void {
  if (fix.accuracyM > rules.maxAccuracyM) throw new LocationInaccurateError();
  if (earlier.length >= rules.maxPerTrip) throw new WaypointLimitError();

  const nearestM = Math.min(
    ...earlier.map((w) => haversineM(fix, { lat: w.lat, lng: w.lng })),
  );
  if (nearestM < rules.minDistanceM) {
    throw new WaypointTooCloseError(Math.ceil(rules.minDistanceM - nearestM));
  }

  const previous = earlier.at(-1);
  if (previous) {
    const allowedAt =
      previous.recordedAt.getTime() + rules.minGapMin * MINUTE_MS;
    const waitMs = allowedAt - fix.recordedAt.getTime();
    if (waitMs > 0)
      throw new WaypointTooSoonError(Math.ceil(waitMs / MINUTE_MS));
  }
}

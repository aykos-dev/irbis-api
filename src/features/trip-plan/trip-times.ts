import { startOfTashkentDay } from '../../lib/dates.js';
import type { TripConfig } from '../levels/game-config.schema.js';
import { TripTimesInvalidError } from './trip-plan.errors.js';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** AC2: throws TRIP_TIMES_INVALID unless the window is valid at `now`. */
export function assertTripTimes(
  startAt: Date,
  backBy: Date,
  now: Date,
  config: Pick<TripConfig, 'maxDurationH' | 'planAheadDays' | 'startGraceMin'>,
): void {
  const start = startAt.getTime();
  const back = backBy.getTime();
  if (back <= start)
    throw new TripTimesInvalidError('backBy must be after startAt');
  if (back - start > config.maxDurationH * HOUR_MS) {
    throw new TripTimesInvalidError('trip is longer than allowed');
  }
  if (start < now.getTime() - config.startGraceMin * MINUTE_MS) {
    throw new TripTimesInvalidError('startAt is in the past');
  }
  const lastDayEnd =
    startOfTashkentDay(now).getTime() + (config.planAheadDays + 1) * DAY_MS;
  if (start >= lastDayEnd) {
    throw new TripTimesInvalidError('startAt is too far ahead');
  }
}

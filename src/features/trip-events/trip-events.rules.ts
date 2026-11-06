import { startOfTashkentDay } from '../../lib/dates.js';
import { GEAR_KEYS } from '../trip-plan/trip-plan.constants.js';
import {
  CARPOOL_SEATS_MAX,
  CARPOOL_SEATS_MIN,
  CARPOOL_TIME_PATTERN,
  CUSTOM_GEAR_ITEM_MAX,
  CUSTOM_GEAR_MAX_ITEMS,
  DESCRIPTION_MAX,
  GROUP_TRIP_PLAN_AHEAD_DAYS,
  GROUP_TRIP_VISIBILITIES,
  MAX_PEOPLE_MAX,
  MAX_PEOPLE_MIN,
  MEETING_TEXT_MAX,
  MIN_LEVEL_MAX,
  MIN_LEVEL_MIN,
  type GroupTripVisibilityCode,
} from './trip-events.constants.js';
import { GroupTripInvalidError } from './trip-events.errors.js';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** What POST /v1/group-trips carries after the DTO's shape checks. */
export interface GroupTripInput {
  visibility: string;
  startAt: string;
  backBy: string;
  meetingText: string;
  meetingLat?: number;
  meetingLng?: number;
  carpoolFrom?: string;
  carpoolSeats?: number;
  maxPeople?: number;
  minLevel?: number;
  gearKeys?: string[];
  customGear?: string[];
  description?: string;
}

export interface GroupTripFields {
  visibility: GroupTripVisibilityCode;
  startAt: Date;
  backBy: Date;
  meetingText: string;
  meetingLat: number | null;
  meetingLng: number | null;
  carpoolFrom: string | null;
  carpoolSeats: number | null;
  maxPeople: number | null;
  minLevel: number | null;
  gearKeys: string[];
  customGear: string[];
  description: string;
}

const inRange = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;

/** AC1: every field rule at once; throws GROUP_TRIP_INVALID listing each bad field. */
export function validateGroupTrip(
  input: GroupTripInput,
  now: Date,
  maxDurationH: number,
): GroupTripFields {
  const errors: Record<string, string[]> = {};
  const fail = (field: string, reason: string): void => {
    (errors[field] ??= []).push(reason);
  };

  if (
    !(GROUP_TRIP_VISIBILITIES as readonly string[]).includes(input.visibility)
  ) {
    fail('visibility', 'isEnum');
  }

  const startAt = new Date(input.startAt);
  const backBy = new Date(input.backBy);
  const start = startAt.getTime();
  const back = backBy.getTime();
  if (Number.isNaN(start)) fail('startAt', 'isDate');
  else if (start <= now.getTime()) fail('startAt', 'inPast');
  else {
    const lastDayEnd =
      startOfTashkentDay(now).getTime() +
      (GROUP_TRIP_PLAN_AHEAD_DAYS + 1) * DAY_MS;
    if (start >= lastDayEnd) fail('startAt', 'tooFarAhead');
  }
  if (Number.isNaN(back)) fail('backBy', 'isDate');
  else if (!Number.isNaN(start)) {
    if (back <= start) fail('backBy', 'notAfterStart');
    else if (back - start > maxDurationH * HOUR_MS) fail('backBy', 'tooLong');
  }

  const meetingText = input.meetingText.trim();
  if (meetingText.length < 1 || meetingText.length > MEETING_TEXT_MAX) {
    fail('meetingText', 'length');
  }
  const hasLat = input.meetingLat !== undefined;
  const hasLng = input.meetingLng !== undefined;
  if (hasLat !== hasLng) fail('meeting', 'latLngTogether');

  const hasFrom = input.carpoolFrom !== undefined;
  const hasSeats = input.carpoolSeats !== undefined;
  if (hasFrom !== hasSeats) fail('carpool', 'fromAndSeatsTogether');
  if (hasFrom && !CARPOOL_TIME_PATTERN.test(input.carpoolFrom ?? '')) {
    fail('carpoolFrom', 'timeOfDay');
  }
  if (
    hasSeats &&
    !inRange(input.carpoolSeats ?? 0, CARPOOL_SEATS_MIN, CARPOOL_SEATS_MAX)
  ) {
    fail('carpoolSeats', 'range');
  }
  if (
    input.maxPeople !== undefined &&
    !inRange(input.maxPeople, MAX_PEOPLE_MIN, MAX_PEOPLE_MAX)
  ) {
    fail('maxPeople', 'range');
  }
  if (
    input.minLevel !== undefined &&
    !inRange(input.minLevel, MIN_LEVEL_MIN, MIN_LEVEL_MAX)
  ) {
    fail('minLevel', 'range');
  }

  const gearKeys = [...new Set(input.gearKeys ?? [])];
  if (gearKeys.some((key) => !(GEAR_KEYS as readonly string[]).includes(key))) {
    fail('gearKeys', 'unknownKey');
  }
  const customGear = [
    ...new Set((input.customGear ?? []).map((item) => item.trim())),
  ];
  if (customGear.length > CUSTOM_GEAR_MAX_ITEMS) fail('customGear', 'tooMany');
  if (
    customGear.some(
      (item) => item.length < 1 || item.length > CUSTOM_GEAR_ITEM_MAX,
    )
  ) {
    fail('customGear', 'itemLength');
  }

  const description = (input.description ?? '').trim();
  if (description.length > DESCRIPTION_MAX) fail('description', 'length');

  if (Object.keys(errors).length > 0) throw new GroupTripInvalidError(errors);
  return {
    visibility: input.visibility as GroupTripVisibilityCode,
    startAt,
    backBy,
    meetingText,
    meetingLat: input.meetingLat ?? null,
    meetingLng: input.meetingLng ?? null,
    carpoolFrom: input.carpoolFrom ?? null,
    carpoolSeats: input.carpoolSeats ?? null,
    maxPeople: input.maxPeople ?? null,
    minLevel: input.minLevel ?? null,
    gearKeys,
    customGear,
    description,
  };
}

/** Free places left, or null when the trip has no cap. */
export function spotsLeft(
  maxPeople: number | null,
  approvedCount: number,
): number | null {
  return maxPeople === null ? null : Math.max(0, maxPeople - approvedCount);
}

export function isFull(
  maxPeople: number | null,
  approvedCount: number,
): boolean {
  return maxPeople !== null && approvedCount >= maxPeople;
}

/** What PATCH /v1/group-trips/:id may carry: `undefined` keeps a field, `null` clears an optional one. */
export type GroupTripPatch = {
  [K in keyof GroupTripInput]?: GroupTripInput[K] | null;
};

const pick = <T>(
  patch: T | null | undefined,
  current: T | null,
): T | undefined =>
  patch === undefined ? (current ?? undefined) : (patch ?? undefined);

/** AC5: the stored trip with the patch applied, ready for validateGroupTrip. */
export function mergeGroupTripPatch(
  current: GroupTripFields,
  patch: GroupTripPatch,
): GroupTripInput {
  return {
    visibility: patch.visibility ?? current.visibility,
    startAt: patch.startAt ?? current.startAt.toISOString(),
    backBy: patch.backBy ?? current.backBy.toISOString(),
    meetingText: patch.meetingText ?? current.meetingText,
    meetingLat: pick(patch.meetingLat, current.meetingLat),
    meetingLng: pick(patch.meetingLng, current.meetingLng),
    carpoolFrom: pick(patch.carpoolFrom, current.carpoolFrom),
    carpoolSeats: pick(patch.carpoolSeats, current.carpoolSeats),
    maxPeople: pick(patch.maxPeople, current.maxPeople),
    minLevel: pick(patch.minLevel, current.minLevel),
    gearKeys: patch.gearKeys ?? current.gearKeys,
    customGear: patch.customGear ?? current.customGear,
    description: patch.description ?? current.description,
  };
}

/** AC5: edits stop at 00:00 Asia/Tashkent on the trip's start day. */
export function isEditLocked(startAt: Date, now: Date): boolean {
  return now.getTime() >= startOfTashkentDay(startAt).getTime();
}

/** AC7: the Asia/Tashkent day [start, end) that contains `at`. */
export function tashkentDayRange(at: Date): { from: Date; to: Date } {
  const from = startOfTashkentDay(at);
  return { from, to: new Date(from.getTime() + DAY_MS) };
}

/** HH:MM in Asia/Tashkent (UTC+5, no DST). */
export function tashkentTime(at: Date): string {
  const local = new Date(at.getTime() + 5 * HOUR_MS);
  return local.toISOString().slice(11, 16);
}

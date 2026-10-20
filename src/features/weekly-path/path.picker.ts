import type { InterestCode } from '../auth/auth.constants.js';
import type { OpenMeteoDaily } from '../conditions/condition.rules.js';
import { isSeasonClosed } from '../conditions/condition.rules.js';
import type {
  ConditionStatusCode,
  OpenMeteoDailyKey,
  Reason,
  WeekendDayName,
} from '../conditions/conditions.constants.js';
import { haversineM, type LatLng } from '../places/place.rules.js';
import type {
  PlaceTypeCode,
  SeasonStatusCode,
} from '../places/places.constants.js';
import {
  INTEREST_TYPES,
  type WeatherDayName,
} from './weekly-path.constants.js';

/** A place with what the path needs: catalog fields, season, active closure and current condition. */
export interface PathPlace {
  id: string;
  slug: string;
  nameUz: string;
  nameRu: string | null;
  nameEn: string | null;
  type: PlaceTypeCode;
  difficulty: number;
  requiredLevel: number;
  elevationM: number;
  latitude: number;
  longitude: number;
  season: SeasonStatusCode[];
  /** A closure is active now. */
  closed: boolean;
  status: ConditionStatusCode | null;
  reasons: Reason[];
}

export interface PickInput {
  level: number;
  interests: readonly InterestCode[];
  /** Tashkent calendar month, 1–12. */
  month: number;
  origin: LatLng;
  nodes: number;
}

const at = (place: PathPlace): LatLng => ({
  lat: place.latitude,
  lng: place.longitude,
});

/** Place types the interests allow; an empty list allows every type. */
export function allowedTypes(
  interests: readonly InterestCode[],
): ReadonlySet<PlaceTypeCode> | null {
  if (interests.length === 0) return null;
  return new Set(interests.flatMap((interest) => INTEREST_TYPES[interest]));
}

/** 0 when the season bar marks `month` as best; 1 otherwise (an empty bar counts as possible). */
const seasonRank = (season: readonly SeasonStatusCode[], month: number) =>
  season.length === 12 && season[month - 1] === 'best' ? 0 : 1;

/**
 * The month's path: eligible places (level, interests, season open this month, no active closure)
 * sorted best-season first, then distance from the origin, then slug. Distinct types are taken
 * first in that order, then the remaining slots are filled from the rest.
 */
export function pickPath(
  places: readonly PathPlace[],
  input: PickInput,
): PathPlace[] {
  const types = allowedTypes(input.interests);
  const sorted = places
    .filter(
      (p) =>
        p.requiredLevel <= input.level &&
        (types === null || types.has(p.type)) &&
        !isSeasonClosed(p.season, input.month) &&
        !p.closed,
    )
    .map((place) => ({
      place,
      rank: seasonRank(place.season, input.month),
      distanceM: haversineM(input.origin, at(place)),
    }))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.distanceM - b.distanceM ||
        (a.place.slug < b.place.slug
          ? -1
          : a.place.slug > b.place.slug
            ? 1
            : 0),
    )
    .map(({ place }) => place);

  const picked: PathPlace[] = [];
  const seenTypes = new Set<PlaceTypeCode>();
  for (const place of sorted) {
    if (picked.length === input.nodes) break;
    if (seenTypes.has(place.type)) continue;
    seenTypes.add(place.type);
    picked.push(place);
  }
  for (const place of sorted) {
    if (picked.length === input.nodes) break;
    if (!picked.includes(place)) picked.push(place);
  }
  return picked;
}

export interface Swap {
  place: PathPlace;
  distanceM: number;
}

/**
 * A `go` place of the same type, open at `level` and not on the path, nearest to `original`.
 * Null when there is none.
 */
export function pickSwap(
  original: PathPlace,
  places: readonly PathPlace[],
  onPath: ReadonlySet<string>,
  level: number,
): Swap | null {
  let best: Swap | null = null;
  for (const place of places) {
    if (
      place.type !== original.type ||
      place.requiredLevel > level ||
      place.status !== 'go' ||
      onPath.has(place.id)
    ) {
      continue;
    }
    const distanceM = haversineM(at(original), at(place));
    if (
      best === null ||
      distanceM < best.distanceM ||
      (distanceM === best.distanceM && place.slug < best.place.slug)
    ) {
      best = { place, distanceM };
    }
  }
  return best;
}

/** The day of the first reason that names one, else `fallback` (the first weekend day). */
export function reasonDay(
  reasons: readonly Reason[],
  fallback: WeekendDayName,
): WeekendDayName {
  return reasons.find((r) => r.day !== undefined)?.day ?? fallback;
}

const DAY_MS = 86_400_000;
const FRIDAY = 5;
const SATURDAY = 6;
const SUNDAY = 0;
const NAMES: readonly WeatherDayName[] = ['fri', 'sat', 'sun'];

export interface WeatherWindowDay {
  date: string;
  day: WeatherDayName;
}

/**
 * Days of the coming weekend for the weather strip, by Tashkent `today` (YYYY-MM-DD):
 * Mon–Fri → Fri, Sat, Sun; Sat → Sat, Sun; Sun → Sun.
 */
export function weatherWindow(today: string): WeatherWindowDay[] {
  const date = new Date(`${today}T00:00:00.000Z`);
  const weekday = date.getUTCDay();
  const iso = (offset: number) =>
    new Date(date.getTime() + offset * DAY_MS).toISOString().slice(0, 10);
  if (weekday === SUNDAY) return [{ date: today, day: 'sun' }];
  if (weekday === SATURDAY) {
    return [
      { date: today, day: 'sat' },
      { date: iso(1), day: 'sun' },
    ];
  }
  const toFriday = FRIDAY - weekday;
  return NAMES.map((day, i) => ({ date: iso(toFriday + i), day }));
}

export interface WeatherDay extends WeatherWindowDay {
  weatherCode: number;
  tMaxC: number;
  windKmh: number;
}

/** Window days found in the stored forecast, values rounded; days missing from it are left out. */
export function weatherDays(
  daily: OpenMeteoDaily,
  window: readonly WeatherWindowDay[],
): WeatherDay[] {
  const value = (key: OpenMeteoDailyKey, i: number): number =>
    Math.round(daily[key]?.[i] ?? 0);
  return window.flatMap((w) => {
    const i = daily.time.indexOf(w.date);
    if (i < 0) return [];
    return [
      {
        ...w,
        weatherCode: value('weather_code', i),
        tMaxC: value('temperature_2m_max', i),
        windKmh: value('wind_speed_10m_max', i),
      },
    ];
  });
}

import type { PlaceTypeCode } from './places.constants.js';

/** Mean Earth radius (IUGG), metres. */
export const EARTH_RADIUS_M = 6_371_008.8;

export interface LatLng {
  lat: number;
  lng: number;
}

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance in whole metres. */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h))));
}

export interface PlaceCandidate {
  id: string;
  type: PlaceTypeCode;
  latitude: number;
  longitude: number;
}

export type WithDistance<T> = T & { distanceM: number };

/**
 * Adds `distanceM` from `origin`, drops places beyond `maxDistanceKm` (inclusive), and sorts
 * by distance ascending, then id.
 */
export function rankByDistance<T extends PlaceCandidate>(
  places: readonly T[],
  origin: LatLng,
  maxDistanceKm?: number,
): WithDistance<T>[] {
  const maxM = maxDistanceKm === undefined ? Infinity : maxDistanceKm * 1000;
  return places
    .map((place) => ({
      ...place,
      distanceM: haversineM(origin, {
        lat: place.latitude,
        lng: place.longitude,
      }),
    }))
    .filter((place) => place.distanceM <= maxM)
    .sort((a, b) =>
      a.distanceM !== b.distanceM
        ? a.distanceM - b.distanceM
        : a.id < b.id
          ? -1
          : a.id > b.id
            ? 1
            : 0,
    );
}

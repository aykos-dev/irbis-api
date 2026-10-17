import type { AppConfig } from '../../config/app-config.js';
import { haversineM } from './place.rules.js';
import type {
  PlaceFilter,
  PlaceRow,
  PlacesRepository,
} from './places.repository.js';
import { PlacesService } from './places.service.js';

const TASHKENT = { lat: 41.2995, lng: 69.2401 };

function place(
  id: string,
  lat: number,
  lng: number,
  extra: Partial<PlaceRow> = {},
): PlaceRow {
  return {
    id,
    slug: `place-${id}`,
    nameUz: `guest_place_${id}`,
    nameRu: null,
    nameEn: null,
    type: 'peak',
    latitude: lat,
    longitude: lng,
    elevationM: 2000,
    difficulty: 2,
    requiredLevel: 2,
    region: null,
    descriptionUz: null,
    descriptionRu: null,
    descriptionEn: null,
    season: [],
    hazards: [],
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...extra,
  };
}

function service(rows: PlaceRow[]): {
  svc: PlacesService;
  filters: PlaceFilter[];
} {
  const filters: PlaceFilter[] = [];
  const repo: Pick<PlacesRepository, 'findCandidates' | 'findById'> = {
    findCandidates: (filter) => {
      filters.push(filter);
      return Promise.resolve(rows);
    },
    findById: (id) =>
      Promise.resolve(rows.find((row) => row.id === id) ?? null),
  };
  const config: Pick<AppConfig, 'placesFallbackOrigin' | 'levelsStartLevel'> = {
    placesFallbackOrigin: TASHKENT,
    levelsStartLevel: 1,
  };
  return {
    svc: new PlacesService(repo as PlacesRepository, config as AppConfig),
    filters,
  };
}

describe('places rules (AC2, AC3)', () => {
  it('haversine: Tashkent → Qorangur is about 71.6 km, in whole metres', () => {
    const d = haversineM(TASHKENT, { lat: 41.395485, lng: 70.086964 });
    expect(Number.isInteger(d)).toBe(true);
    expect(d).toBeGreaterThan(71_600 * 0.99);
    expect(d).toBeLessThan(71_600 * 1.01);
  });

  it('list: sorts by distance then id, drops places beyond maxDistanceKm, pages with a cursor', async () => {
    const rows = [
      place('c', 41.6, 69.9), // ~65 km
      place('b', 41.31, 69.25), // ~1.4 km
      place('a', 41.31, 69.25), // same distance as b → id order
      place('far', 39.65, 66.96), // Samarkand, ~270 km
    ];
    const { svc, filters } = service(rows);
    const page1 = await svc.list({
      maxDistanceKm: 100,
      limit: 2,
      types: ['peak'],
      difficultyMin: 1,
    });
    expect(filters[0]).toEqual({
      types: ['peak'],
      difficultyMin: 1,
      difficultyMax: undefined,
    });
    expect(page1.origin).toBe('tashkent');
    expect(page1.total).toBe(3);
    expect(page1.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(page1.nextCursor).not.toBeNull();
    const page2 = await svc.list({
      maxDistanceKm: 100,
      limit: 2,
      cursor: page1.nextCursor ?? '',
    });
    expect(page2.items.map((i) => i.id)).toEqual(['c']);
    expect(page2.nextCursor).toBeNull();
    await expect(svc.list({ cursor: 'not-a-cursor' })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
  });

  it('detail: device origin when lat/lng given, viewer from the start level, 404 when unknown', async () => {
    const { svc } = service([
      place('x', 41.31, 69.25, { requiredLevel: 3 }),
      place('y', 41.31, 69.25, { requiredLevel: 1 }),
    ]);
    const x = await svc.detail('x', { lat: 41.31, lng: 69.25 });
    expect(x).toMatchObject({
      origin: 'device',
      distanceM: 0,
      viewer: { level: 1, qualifies: false },
    });
    const y = await svc.detail('y', {});
    expect(y).toMatchObject({
      origin: 'tashkent',
      viewer: { level: 1, qualifies: true },
    });
    await expect(svc.detail('nope', {})).rejects.toMatchObject({
      code: 'PLACE_NOT_FOUND',
      status: 404,
    });
  });
});

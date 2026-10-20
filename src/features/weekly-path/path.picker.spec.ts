import type { SeasonStatusCode } from '../places/places.constants.js';
import {
  pickPath,
  pickSwap,
  weatherDays,
  weatherWindow,
  type PathPlace,
  type PickInput,
} from './path.picker.js';

const ORIGIN = { lat: 41.3111, lng: 69.2797 };
const OCTOBER = 10;

/** A 12-month bar with `status` in October and `possible` elsewhere. */
const october = (status: SeasonStatusCode): SeasonStatusCode[] =>
  Array.from({ length: 12 }, (_, i) =>
    i === OCTOBER - 1 ? status : 'possible',
  );

/** Synthetic place `km` km north of the origin. */
function place(
  slug: string,
  over: Partial<PathPlace> & { km?: number } = {},
): PathPlace {
  const { km = 10, ...rest } = over;
  return {
    id: `id-${slug}`,
    slug,
    nameUz: slug,
    nameRu: null,
    nameEn: null,
    type: 'peak',
    difficulty: 1,
    requiredLevel: 1,
    elevationM: 1000,
    latitude: ORIGIN.lat + km / 111.2,
    longitude: ORIGIN.lng,
    season: [],
    closed: false,
    status: 'go',
    reasons: [],
    ...rest,
  };
}

const input = (over: Partial<PickInput> = {}): PickInput => ({
  level: 1,
  interests: [],
  month: OCTOBER,
  origin: ORIGIN,
  nodes: 3,
  ...over,
});

const slugs = (places: PathPlace[]) => places.map((p) => p.slug);

describe('pickPath (AC1)', () => {
  it('keeps places open at the level, not season-closed and not under an active closure', () => {
    const places = [
      place('open', { km: 5 }),
      place('too-high', { km: 1, requiredLevel: 2, type: 'lake' }),
      place('season-closed', {
        km: 2,
        season: october('closed'),
        type: 'cave',
      }),
      place('closure', { km: 3, closed: true, type: 'trail' }),
    ];
    expect(slugs(pickPath(places, input()))).toEqual(['open']);
    expect(slugs(pickPath(places, input({ level: 2 })))).toEqual([
      'too-high',
      'open',
    ]);
  });

  it('maps lakes to lake + waterfall and trails to trail + canyon', () => {
    const places = [
      place('peak', { km: 1, type: 'peak' }),
      place('waterfall', { km: 2, type: 'waterfall' }),
      place('canyon', { km: 3, type: 'canyon' }),
      place('lake', { km: 4, type: 'lake' }),
      place('cave', { km: 5, type: 'cave' }),
    ];
    expect(
      slugs(pickPath(places, input({ interests: ['lakes', 'trails'] }))),
    ).toEqual(['waterfall', 'canyon', 'lake']);
  });

  it('puts best-season places first, then nearer, then by slug', () => {
    const places = [
      place('near-possible', { km: 1, type: 'peak' }),
      place('far-best', { km: 50, type: 'lake', season: october('best') }),
      place('b-tie', { km: 20, type: 'cave' }),
      place('a-tie', { km: 20, type: 'trail' }),
    ];
    expect(slugs(pickPath(places, input()))).toEqual([
      'far-best',
      'near-possible',
      'a-tie',
    ]);
  });

  it('takes distinct types first, then fills from the rest; fewer than 3 and zero', () => {
    const places = [
      place('peak-1', { km: 1 }),
      place('peak-2', { km: 2 }),
      place('lake-1', { km: 3, type: 'lake' }),
    ];
    expect(slugs(pickPath(places, input()))).toEqual([
      'peak-1',
      'lake-1',
      'peak-2',
    ]);
    expect(slugs(pickPath(places.slice(0, 2), input()))).toEqual([
      'peak-1',
      'peak-2',
    ]);
    expect(pickPath(places, input({ interests: ['caves'] }))).toEqual([]);
  });
});

describe('pickSwap (AC3)', () => {
  const original = place('orig', { km: 10, status: 'not_now' });

  it('picks the nearest go place of the same type, open at the level, not on the path', () => {
    const places = [
      original,
      place('on-path', { km: 10.5 }),
      place('other-type', { km: 10.6, type: 'lake' }),
      place('caution', { km: 10.7, status: 'caution' }),
      place('too-high', { km: 10.8, requiredLevel: 3 }),
      place('far', { km: 30, elevationM: 1200 }),
      place('near', { km: 14, elevationM: 900 }),
    ];
    const swap = pickSwap(
      original,
      places,
      new Set(['id-orig', 'id-on-path']),
      1,
    );
    expect(swap?.place.slug).toBe('near');
    expect(Math.round((swap?.distanceM ?? 0) / 1000)).toBe(4);
  });

  it('is null when no place fits', () => {
    const places = [original, place('caution', { status: 'caution' })];
    expect(pickSwap(original, places, new Set(['id-orig']), 1)).toBeNull();
  });
});

describe('weatherWindow (AC7)', () => {
  // 2026-10-19 is a Monday.
  it('Mon gives the coming Fri, Sat, Sun', () => {
    expect(weatherWindow('2026-10-19')).toEqual([
      { date: '2026-10-23', day: 'fri' },
      { date: '2026-10-24', day: 'sat' },
      { date: '2026-10-25', day: 'sun' },
    ]);
  });

  it('Sat gives Sat + Sun, Sun gives Sun', () => {
    expect(weatherWindow('2026-10-24').map((d) => d.day)).toEqual([
      'sat',
      'sun',
    ]);
    expect(weatherWindow('2026-10-25')).toEqual([
      { date: '2026-10-25', day: 'sun' },
    ]);
  });

  it('reads rounded values from the stored forecast and skips missing days', () => {
    const daily = {
      time: ['2026-10-23', '2026-10-24'],
      weather_code: [3, 61],
      temperature_2m_max: [18.6, 14.2],
      wind_speed_10m_max: [10.4, 22.5],
    };
    expect(weatherDays(daily, weatherWindow('2026-10-19'))).toEqual([
      {
        date: '2026-10-23',
        day: 'fri',
        weatherCode: 3,
        tMaxC: 19,
        windKmh: 10,
      },
      {
        date: '2026-10-24',
        day: 'sat',
        weatherCode: 61,
        tMaxC: 14,
        windKmh: 23,
      },
    ]);
  });
});

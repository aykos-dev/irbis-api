import { describe, expect, it } from 'vitest';
import { BADGES, BADGE_BY_KEY } from './badges.catalog.js';
import {
  BADGE_GROUPS,
  BADGE_RARITIES,
  REGION_CODES,
  SHOWCASE_MAX,
  type BadgeGroupCode,
} from './badges.constants.js';
import {
  __testing,
} from './badges.service.js';
import type { BadgeFacts } from './badges.repository.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function facts(overrides: Partial<BadgeFacts> = {}): BadgeFacts {
  return {
    startAt: new Date('2026-10-30T00:00:00.000Z'),
    checkIns: [],
    trips: [],
    lessons: 0,
    waypoints: 0,
    plannedTrips: 0,
    chests: 0,
    level: 1,
    levelReachedAt: new Date('2026-10-30T00:00:00.000Z'),
    activityDays: [],
    groupTrips: 0,
    buddyRatings: 0,
    topShotWins: 0,
    verifiedSpots: 0,
    ...overrides,
  };
}

function checkIn(
  placeId: string,
  options: {
    type?: BadgeFacts['checkIns'][number]['type'];
    recordedAt?: Date;
    region?: string | null;
    latitude?: number;
    longitude?: number;
    elevationM?: number;
  } = {},
): BadgeFacts['checkIns'][number] {
  return {
    placeId,
    month: '2026-10',
    recordedAt: options.recordedAt ?? new Date('2026-10-15T08:00:00.000Z'),
    type: options.type ?? 'peak',
    elevationM: options.elevationM ?? 2500,
    region: options.region ?? null,
    latitude: options.latitude ?? 41.31,
    longitude: options.longitude ?? 69.28,
  };
}

describe('badge catalogue', () => {
  it('has exactly 64 badges with unique keys across the five groups', () => {
    expect(BADGES).toHaveLength(64);
    expect(new Set(BADGES.map((badge) => badge.key)).size).toBe(64);
    expect(new Set(BADGES.map((badge) => badge.group))).toEqual(
      new Set(BADGE_GROUPS),
    );
    expect(BADGE_BY_KEY.size).toBe(64);
  });

  it('uses only declared rarities, positive targets and three locales', () => {
    for (const badge of BADGES) {
      expect(BADGE_RARITIES).toContain(badge.rarity);
      expect(badge.target).toBeGreaterThan(0);
      expect(badge.title.uz.length).toBeGreaterThan(0);
      expect(badge.title.ru.length).toBeGreaterThan(0);
      expect(badge.title.en.length).toBeGreaterThan(0);
      expect(badge.description.uz.length).toBeGreaterThan(0);
      expect(badge.description.ru.length).toBeGreaterThan(0);
      expect(badge.description.en.length).toBeGreaterThan(0);
    }
  });

  it('names a region badge for every supported region', () => {
    const regionRules = BADGES.filter(
      (badge) => badge.rule.kind === 'region_places',
    ).map((badge) => (badge.rule as { region: string }).region);
    expect(new Set(regionRules)).toEqual(new Set(REGION_CODES));
  });

  it('has a 19-badge milestones filler and the canvas groups add up to 64', () => {
    const count = (group: BadgeGroupCode) =>
      BADGES.filter((badge) => badge.group === group).length;
    expect(count('places')).toBe(15);
    expect(count('regions')).toBe(12);
    expect(count('seasons')).toBe(8);
    expect(count('social')).toBe(10);
    expect(count('milestones')).toBe(19);
  });
});

describe('badge counters', () => {
  it('counts distinct places per type, visits and regions (fallback Tashkent box)', () => {
    const counters = __testing.computeCounters(
      facts({
        checkIns: [
          checkIn('peak-1'),
          checkIn('peak-1'),
          checkIn('peak-2'),
          checkIn('lake-1', { type: 'lake' }),
          checkIn('outside', { type: 'trail', longitude: 60 }),
        ],
      }),
    );
    expect(counters.placeTypePlaces.peak).toBe(2);
    expect(counters.placeTypeVisits.peak).toBe(3);
    expect(counters.placeTypePlaces.lake).toBe(1);
    expect(counters.regionPlaces.tashkent).toBe(3);
    expect(counters.checkIns).toBe(5);
  });

  it('maps region names before falling back to coordinates', () => {
    const counters = __testing.computeCounters(
      facts({
        checkIns: [
          checkIn('samarqand', { region: 'Samarqand viloyati' }),
          checkIn('zomin', { region: 'Zaamin National Park' }),
          checkIn('fergana', { region: 'Farg‘ona' }),
        ],
      }),
    );
    expect(counters.regionPlaces.samarkand).toBe(1);
    expect(counters.regionPlaces.zaamin).toBe(1);
    expect(counters.regionPlaces.fergana).toBe(1);
  });

  it('counts the longest runs of consecutive activity days and weeks', () => {
    const counters = __testing.computeCounters(
      facts({
        activityDays: [
          new Date('2026-10-05T00:00:00.000Z'),
          new Date('2026-10-06T00:00:00.000Z'),
          new Date('2026-10-07T00:00:00.000Z'),
          // Monday 2026-10-12 and 2026-10-19 are separate weeks.
          new Date('2026-10-12T00:00:00.000Z'),
          new Date('2026-10-19T00:00:00.000Z'),
        ],
      }),
    );
    expect(counters.flameDays).toBe(3);
    expect(counters.bootWeeks).toBe(3);
  });

  it('counts weekday trip shapes in Tashkent time', () => {
    const counters = __testing.computeCounters(
      facts({
        trips: [
          {
            distanceM: 12_400,
            climbM: 800,
            startAt: new Date('2026-10-17T01:00:00.000Z'), // Sat 06:00 Tashkent
            checkedOutAt: new Date('2026-10-17T16:00:00.000Z'), // Sat 21:00
            alertSentAt: null,
            createdAt: new Date('2026-10-17T01:00:00.000Z'),
          },
          {
            distanceM: 600,
            climbM: 40,
            startAt: new Date('2026-10-19T05:00:00.000Z'), // Mon 10:00
            checkedOutAt: new Date('2026-10-19T10:00:00.000Z'), // Mon 15:00
            alertSentAt: null,
            createdAt: new Date('2026-10-19T05:00:00.000Z'),
          },
        ],
      }),
    );
    expect(counters.walkedKm).toBe(13);
    expect(counters.climbedM).toBe(840);
    expect(counters.earlyTrips).toBe(1);
    expect(counters.lateCheckouts).toBe(1);
    expect(counters.weekendTrips).toBe(1);
    expect(counters.onTimeTrips).toBe(1);
  });

  it('counts seasons from the months that have places', () => {
    const counters = __testing.computeCounters(
      facts({
        checkIns: [
          checkIn('winter', { recordedAt: new Date('2026-01-10T08:00:00.000Z') }),
          checkIn('spring', { recordedAt: new Date('2026-04-10T08:00:00.000Z') }),
          checkIn('summer', { recordedAt: new Date('2026-07-10T08:00:00.000Z') }),
          checkIn('autumn', { recordedAt: new Date('2026-10-10T08:00:00.000Z') }),
        ],
      }),
    );
    expect(counters.seasonPlaces[1]).toBe(1);
    expect(counters.seasonPlaces[4]).toBe(1);
    expect(counters.seasonPlaces[7]).toBe(1);
    expect(counters.seasonPlaces[10]).toBe(1);
    expect(counters.seasonsAll).toBe(4);
  });

  it('ignores a level reached before the cutoff', () => {
    const before = __testing.computeCounters(
      facts({
        level: 6,
        levelReachedAt: new Date('2026-10-01T00:00:00.000Z'),
      }),
    );
    const after = __testing.computeCounters(
      facts({
        level: 6,
        levelReachedAt: new Date('2026-10-30T12:00:00.000Z'),
      }),
    );
    expect(before.level).toBe(0);
    expect(after.level).toBe(6);
  });
});

describe('showcase', () => {
  const at = new Date('2026-10-30T10:00:00.000Z');
  const awards = [
    { key: 'a', earnedAt: new Date(at.getTime() - DAY), showcaseOrder: null },
    { key: 'b', earnedAt: new Date(at.getTime() - 2 * DAY), showcaseOrder: 2 },
    { key: 'c', earnedAt: at, showcaseOrder: 1 },
    { key: 'd', earnedAt: new Date(at.getTime() - 3 * DAY), showcaseOrder: null },
    { key: 'e', earnedAt: new Date(at.getTime() - 4 * DAY), showcaseOrder: null },
  ];

  it('uses the explicit picks in order, then fills with the newest earned', () => {
    expect(__testing.resolveShowcase(awards)).toEqual(['c', 'b', 'a', 'd']);
    expect(__testing.resolveShowcase([])).toEqual([]);
  });

  it('caps at four badges', () => {
    expect(__testing.resolveShowcase(awards)).toHaveLength(SHOWCASE_MAX);
  });
});

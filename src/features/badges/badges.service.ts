import { Injectable } from '@nestjs/common';
import {
  BADGE_BY_KEY,
  BADGES,
} from './badges.catalog.js';
import {
  BADGE_GROUPS,
  REGION_CODES,
  SHOWCASE_MAX,
  type BadgeGroupCode,
  type BadgePlaceType,
  type BadgeRule,
  type LocalizedBadgeText,
  type RegionCode,
} from './badges.constants.js';
import {
  BadgeNotEarnedError,
  BadgeProfileNotFoundError,
} from './badges.errors.js';
import {
  BadgesRepository,
  type BadgeAwardRow,
  type BadgeFacts,
  type CheckInFact,
} from './badges.repository.js';
import type {
  BadgeDto,
  BadgeGroupDto,
  BadgesListDto,
  PublicBadgeDto,
  PublicBadgesDto,
} from './dto/badges.response.dto.js';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const TASHKENT_OFFSET_MS = 5 * HOUR_MS;

type Counters = {
  placeTypePlaces: Record<string, number>;
  placeTypeVisits: Record<string, number>;
  walkedKm: number;
  climbedM: number;
  regionPlaces: Record<string, number>;
  seasonPlaces: Record<number, number>;
  seasonsAll: number;
  groupTrips: number;
  verifiedSpots: number;
  onTimeTrips: number;
  level: number;
  buddyRatings: number;
  topShotWins: number;
  weekendTrips: number;
  checkIns: number;
  monthPlaces: number;
  peakVisits: number;
  maxElevation: number;
  lessons: number;
  flameDays: number;
  bootWeeks: number;
  earlyTrips: number;
  lateCheckouts: number;
  plannedTrips: number;
  waypoints: number;
  chests: number;
};

const GROUP_TITLES: Record<BadgeGroupCode, LocalizedBadgeText> = {
  places: { uz: 'Joy turlari', ru: 'Типы мест', en: 'Place types' },
  regions: { uz: 'Viloyatlar', ru: 'Регионы', en: 'Regions' },
  seasons: { uz: 'Fasllar', ru: 'Сезоны', en: 'Seasons' },
  social: {
    uz: 'Ijtimoiy va kashfiyot',
    ru: 'Социальные и открытия',
    en: 'Social & discoverer',
  },
  milestones: { uz: 'Bosqichlar', ru: 'Этапы', en: 'Milestones' },
};

/** Tashkent YYYY-MM for a check-in's recorded day. */
function tashkentMonthNumber(date: Date): number {
  return new Date(date.getTime() + TASHKENT_OFFSET_MS).getUTCMonth() + 1;
}

function tashkentHour(date: Date): number {
  return new Date(date.getTime() + TASHKENT_OFFSET_MS).getUTCHours();
}

function tashkentWeekend(date: Date): boolean {
  const day = new Date(date.getTime() + TASHKENT_OFFSET_MS).getUTCDay();
  return day === 0 || day === 6;
}

function seasonOf(month: number): number {
  if (month >= 3 && month <= 5) return 0;
  if (month >= 6 && month <= 8) return 1;
  if (month >= 9 && month <= 11) return 2;
  return 3;
}

const REGION_WORDS: Array<[RegionCode, string[]]> = [
  ['ugam-chatkal', ['ugam', 'chatkal', 'chatqal', 'chotqol']],
  ['zaamin', ['zaamin', 'zomin']],
  ['surkhandarya', ['surkhandarya', 'surxondaryo', 'surxon']],
  ['samarkand', ['samarkand', 'samarqand']],
  ['bukhara', ['bukhara', 'buxoro']],
  ['navoiy', ['navoiy', 'navoi']],
  ['jizzakh', ['jizzakh', 'jizzax']],
  ['fergana', ['fergana', 'farg‘ona', 'fargona']],
  ['namangan', ['namangan']],
  ['andijan', ['andijan', 'andijon']],
  ['karakalpakstan', ['karakalpakstan', 'qoraqalpog']],
  ['tashkent', ['tashkent', 'toshkent', 'toshkent shahri']],
];

/** Tashkent region fallback box for seeded places that have no `region` text yet. */
function isTashkentRegion(lat: number, lng: number): boolean {
  return lat >= 40.8 && lat <= 41.8 && lng >= 69.1 && lng <= 70.7;
}

function regionOf(checkIn: CheckInFact): RegionCode | null {
  const haystack = (checkIn.region ?? '').toLowerCase();
  for (const [code, words] of REGION_WORDS) {
    if (words.some(word => haystack.includes(word))) return code;
  }
  if (isTashkentRegion(checkIn.latitude, checkIn.longitude)) return 'tashkent';
  return null;
}

/** Longest run of consecutive calendar days. */
function dayRun(days: Date[]): number {
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of days) {
    const stamp = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
    run = previous !== null && stamp - previous === DAY_MS ? run + 1 : 1;
    best = Math.max(best, run);
    previous = stamp;
  }
  return best;
}

/** Longest run of consecutive ISO weeks that each had activity. */
function weekRun(days: Date[]): number {
  const weeks: number[] = [];
  for (const day of days) {
    const stamp = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
    const weekday = (new Date(stamp).getUTCDay() + 6) % 7;
    const monday = stamp - weekday * DAY_MS;
    if (weeks[weeks.length - 1] !== monday) weeks.push(monday);
  }
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const monday of weeks) {
    run = previous !== null && monday - previous === 7 * DAY_MS ? run + 1 : 1;
    best = Math.max(best, run);
    previous = monday;
  }
  return best;
}

function computeCounters(facts: BadgeFacts): Counters {
  const placeSets = new Map<BadgePlaceType, Set<string>>();
  const visitCounts = new Map<BadgePlaceType, number>();
  const regions = new Map<RegionCode, Set<string>>();
  const seasonPlaceSets = new Map<number, Set<string>>();
  const monthSets = new Map<string, Set<string>>();
  let walkedM = 0;
  let climbedM = 0;
  let peakVisits = 0;
  let maxElevation = 0;
  let earlyTrips = 0;
  let lateCheckouts = 0;
  let weekendTrips = 0;
  let onTime = 0;

  for (const checkIn of facts.checkIns) {
    const places = placeSets.get(checkIn.type) ?? new Set<string>();
    places.add(checkIn.placeId);
    placeSets.set(checkIn.type, places);
    visitCounts.set(checkIn.type, (visitCounts.get(checkIn.type) ?? 0) + 1);
    const month = tashkentMonthNumber(checkIn.recordedAt);
    const seasonPlaces = seasonPlaceSets.get(month) ?? new Set<string>();
    seasonPlaces.add(checkIn.placeId);
    seasonPlaceSets.set(month, seasonPlaces);
    const monthKey = checkIn.month;
    const monthSet = monthSets.get(monthKey) ?? new Set<string>();
    monthSet.add(checkIn.placeId);
    monthSets.set(monthKey, monthSet);
    const region = regionOf(checkIn);
    if (region) {
      const regionSet = regions.get(region) ?? new Set<string>();
      regionSet.add(checkIn.placeId);
      regions.set(region, regionSet);
    }
    if (checkIn.type === 'peak') peakVisits += 1;
    maxElevation = Math.max(maxElevation, checkIn.elevationM);
  }

  for (const trip of facts.trips) {
    walkedM += trip.distanceM;
    climbedM += trip.climbM;
    if (tashkentHour(trip.startAt) < 7) earlyTrips += 1;
    if (trip.checkedOutAt && tashkentHour(trip.checkedOutAt) >= 20) lateCheckouts += 1;
    if (tashkentWeekend(trip.startAt)) weekendTrips += 1;
  }
  if (facts.trips.length > 0 && facts.trips.every(trip => trip.alertSentAt === null)) {
    onTime = 1;
  }

  const seasonPlaceCounts: Record<number, number> = {};
  for (let month = 1; month <= 12; month += 1) {
    seasonPlaceCounts[month] = seasonPlaceSets.get(month)?.size ?? 0;
  }
  const seasonsAll = new Set(
    facts.checkIns
      .filter(checkIn => (seasonPlaceSets.get(tashkentMonthNumber(checkIn.recordedAt))?.size ?? 0) > 0)
      .map(checkIn => seasonOf(tashkentMonthNumber(checkIn.recordedAt))),
  ).size;

  const regionCounts: Record<string, number> = {};
  for (const code of REGION_CODES) regionCounts[code] = regions.get(code)?.size ?? 0;

  const placeTypePlaces: Record<string, number> = {};
  const placeTypeVisits: Record<string, number> = {};
  for (const [type, places] of placeSets) placeTypePlaces[type] = places.size;
  for (const [type, visits] of visitCounts) placeTypeVisits[type] = visits;

  return {
    placeTypePlaces,
    placeTypeVisits,
    walkedKm: Math.floor(walkedM / 1000),
    climbedM,
    regionPlaces: regionCounts,
    seasonPlaces: seasonPlaceCounts,
    seasonsAll,
    groupTrips: facts.groupTrips,
    verifiedSpots: facts.verifiedSpots,
    onTimeTrips: onTime,
    level: facts.levelReachedAt >= facts.startAt ? facts.level : 0,
    buddyRatings: facts.buddyRatings,
    topShotWins: facts.topShotWins,
    weekendTrips,
    checkIns: facts.checkIns.length,
    monthPlaces: Math.max(0, ...Array.from(monthSets.values(), set => set.size)),
    peakVisits,
    maxElevation,
    lessons: facts.lessons,
    flameDays: dayRun(facts.activityDays),
    bootWeeks: weekRun(facts.activityDays),
    earlyTrips,
    lateCheckouts,
    plannedTrips: facts.plannedTrips,
    waypoints: facts.waypoints,
    chests: facts.chests,
  };
}

function progressFor(rule: BadgeRule, counters: Counters): number {
  switch (rule.kind) {
    case 'place_type_places':
      return counters.placeTypePlaces[rule.type] ?? 0;
    case 'place_type_visits':
      return counters.placeTypeVisits[rule.type] ?? 0;
    case 'walked_km':
      return counters.walkedKm;
    case 'climbed_m':
      return counters.climbedM;
    case 'region_places':
      return counters.regionPlaces[rule.region] ?? 0;
    case 'season_places':
      return counters.seasonPlaces[rule.months[0]] ?? 0;
    case 'seasons_all':
      return counters.seasonsAll;
    case 'group_trips':
      return counters.groupTrips;
    case 'verified_spots':
      return counters.verifiedSpots;
    case 'on_time_trips':
      return counters.onTimeTrips;
    case 'level':
      return counters.level;
    case 'buddy_ratings':
      return counters.buddyRatings;
    case 'top_shot_wins':
      return counters.topShotWins;
    case 'weekend_trips':
      return counters.weekendTrips;
    case 'check_ins':
      return counters.checkIns;
    case 'month_places':
      return counters.monthPlaces;
    case 'peak_visits':
      return counters.peakVisits;
    case 'max_elevation':
      return counters.maxElevation;
    case 'lessons':
      return counters.lessons;
    case 'flame_days':
      return counters.flameDays;
    case 'boot_weeks':
      return counters.bootWeeks;
    case 'early_trips':
      return counters.earlyTrips;
    case 'late_checkouts':
      return counters.lateCheckouts;
    case 'planned_trips':
      return counters.plannedTrips;
    case 'waypoints':
      return counters.waypoints;
    case 'chests':
      return counters.chests;
  }
}

/** Default showcase: the user's explicit picks, then the newest earned badges. */
function resolveShowcase(awards: BadgeAwardRow[]): string[] {
  const picked = awards
    .filter(row => row.showcaseOrder !== null)
    .sort((a, b) => (a.showcaseOrder ?? 0) - (b.showcaseOrder ?? 0))
    .map(row => row.key);
  const newest = [...awards]
    .sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime())
    .map(row => row.key);
  const result: string[] = [];
  for (const key of [...picked, ...newest]) {
    if (result.length >= SHOWCASE_MAX) break;
    if (!result.includes(key)) result.push(key);
  }
  return result;
}

@Injectable()
export class BadgesService {
  constructor(private readonly repository: BadgesRepository) {}

  /** The signed-in user's catalogue with live progress; newly met badges are awarded here. */
  async listMine(userId: string): Promise<BadgesListDto> {
    const facts = await this.repository.facts(userId);
    const counters = computeCounters(facts);
    const now = new Date();
    const met = BADGES.filter(
      badge => progressFor(badge.rule, counters) >= badge.target,
    ).map(badge => badge.key);
    await this.repository.insertAwards(userId, met, now);
    const awards = await this.repository.awards(userId);
    return buildList(awards, counters);
  }

  /** Guests can browse the catalogue; there is no progress without an account. */
  listGuest(): BadgesListDto {
    return buildList([], null);
  }

  async setShowcase(userId: string, keys: string[]): Promise<BadgesListDto> {
    const unique = [...new Set(keys)];
    if (unique.length !== keys.length || unique.length > SHOWCASE_MAX) {
      throw new BadgeNotEarnedError();
    }
    if (unique.length > 0) {
      const facts = await this.repository.facts(userId);
      const counters = computeCounters(facts);
      const met = new Set(
        BADGES.filter(badge => progressFor(badge.rule, counters) >= badge.target).map(
          badge => badge.key,
        ),
      );
      await this.repository.insertAwards(userId, [...met], new Date());
      const awards = await this.repository.awards(userId);
      const earned = new Set(awards.map(row => row.key));
      if (unique.some(key => !earned.has(key))) throw new BadgeNotEarnedError();
      await this.repository.setShowcase(userId, unique);
      const refreshed = await this.repository.awards(userId);
      return buildList(refreshed, counters);
    }
    await this.repository.setShowcase(userId, []);
    const facts = await this.repository.facts(userId);
    return buildList(await this.repository.awards(userId), computeCounters(facts));
  }

  /** A public profile's showcase; hidden when the profile is private, deleted or blocked. */
  async publicShowcase(username: string): Promise<PublicBadgesDto> {
    const user = await this.repository.publicUser(username.trim().toLowerCase());
    if (!user || !user.publicProfile || user.deletedAt || user.blockedAt) {
      throw new BadgeProfileNotFoundError();
    }
    const awards = await this.repository.publicAwards(user.id);
    const items: PublicBadgeDto[] = [];
    for (const award of awards) {
      const badge = BADGE_BY_KEY.get(award.key);
      if (!badge) continue;
      items.push({
        key: badge.key,
        title: badge.title,
        rarity: badge.rarity,
        art: badge.art,
        earnedAt: award.earnedAt.toISOString(),
      });
    }
    return { username: user.username, items };
  }
}

function buildList(
  awards: BadgeAwardRow[],
  counters: Counters | null,
): BadgesListDto {
  const earnedAt = new Map(awards.map(row => [row.key, row.earnedAt]));
  const showcase = resolveShowcase(awards);
  const items: BadgeDto[] = BADGES.map(badge => {
    const progress = counters ? progressFor(badge.rule, counters) : 0;
    return {
      key: badge.key,
      group: badge.group,
      rarity: badge.rarity,
      title: badge.title,
      description: badge.description,
      target: badge.target,
      progress: Math.min(progress, badge.target),
      earnedAt: earnedAt.get(badge.key)?.toISOString() ?? null,
      showcase: showcase.includes(badge.key),
      art: badge.art,
    };
  });
  const groups: BadgeGroupDto[] = BADGE_GROUPS.map(group => ({
    key: group,
    title: GROUP_TITLES[group],
    earned: items.filter(item => item.group === group && item.earnedAt).length,
    total: items.filter(item => item.group === group).length,
  }));
  return {
    items,
    groups,
    collected: items.filter(item => item.earnedAt).length,
    total: items.length,
    showcase,
  };
}

/** Exported for the unit tests. */
export const __testing = { computeCounters, progressFor, resolveShowcase };

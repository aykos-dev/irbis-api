/** Place types the badge rules can count (mirrors the Prisma enum without importing it). */
export const BADGE_PLACE_TYPES = [
  'peak',
  'lake',
  'cave',
  'camping',
  'trail',
  'waterfall',
  'canyon',
] as const;

export type BadgePlaceType = (typeof BADGE_PLACE_TYPES)[number];

/** The five catalogue groups on the Badges board (plus the milestone group). */
export const BADGE_GROUPS = [
  'places',
  'regions',
  'seasons',
  'social',
  'milestones',
] as const;

export type BadgeGroupCode = (typeof BADGE_GROUPS)[number];

export const BADGE_RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;

export type BadgeRarityCode = (typeof BADGE_RARITIES)[number];

/**
 * Badge rules read existing product data only. `earned` is true when progress reaches `target`;
 * a badge stays earned once awarded, even if its source is later deleted.
 */
export type BadgeRule =
  | { kind: 'place_type_places'; type: BadgePlaceType }
  | { kind: 'place_type_visits'; type: BadgePlaceType }
  | { kind: 'walked_km' }
  | { kind: 'climbed_m' }
  | { kind: 'region_places'; region: RegionCode }
  | { kind: 'season_places'; months: number[] }
  | { kind: 'seasons_all' }
  | { kind: 'group_trips' }
  | { kind: 'verified_spots' }
  | { kind: 'on_time_trips' }
  | { kind: 'level'; level: number }
  | { kind: 'buddy_ratings' }
  | { kind: 'top_shot_wins' }
  | { kind: 'weekend_trips' }
  | { kind: 'check_ins' }
  | { kind: 'month_places' }
  | { kind: 'peak_visits' }
  | { kind: 'max_elevation' }
  | { kind: 'lessons' }
  | { kind: 'flame_days' }
  | { kind: 'boot_weeks' }
  | { kind: 'early_trips' }
  | { kind: 'late_checkouts' }
  | { kind: 'planned_trips' }
  | { kind: 'waypoints' }
  | { kind: 'chests' };

/** Regions with a badge. `ugam-chatkal` is a park inside Tashkent region, kept separate. */
export const REGION_CODES = [
  'tashkent',
  'ugam-chatkal',
  'zaamin',
  'surkhandarya',
  'samarkand',
  'bukhara',
  'navoiy',
  'jizzakh',
  'fergana',
  'namangan',
  'andijan',
  'karakalpakstan',
] as const;

export type RegionCode = (typeof REGION_CODES)[number];

export type LocalizedBadgeText = { uz: string; ru: string; en: string };

export interface BadgeDefinition {
  key: string;
  group: BadgeGroupCode;
  rarity: BadgeRarityCode;
  rule: BadgeRule;
  target: number;
  title: LocalizedBadgeText;
  description: LocalizedBadgeText;
  /** File stem in the app's badge art set; null means a code-drawn hexagon. */
  art: string | null;
}

/** A badge is capped at this many showcase slots on the profile. */
export const SHOWCASE_MAX = 4;

/** GameConfig key for the badges feature. */
export const BADGES_CONFIG_KEY = 'badges.config';

/** Fallback release cutoff when the seed row is missing (badges count activity from here on). */
export const BADGES_DEFAULT_START_AT = '2026-10-30T00:00:00.000Z';

/** Mirrors the Prisma enums `XpSource` / `LevelFactKind` (kept as plain unions so services stay Prisma-free). */
export const XP_SOURCES = [
  'lesson',
  'check_in',
  'waypoint',
  'discoverer',
  'top_shots',
  'post',
  'game',
  'campfire',
  'qa_grant',
  'path_chest',
] as const;
export type XpSourceCode = (typeof XP_SOURCES)[number];

export const LEVEL_FACT_KINDS = [
  'lesson',
  'check_in',
  'verified_spot',
] as const;
export type LevelFactKindCode = (typeof LEVEL_FACT_KINDS)[number];

export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 5;

/** GameConfig keys owned by levels. */
export const GAME_CONFIG_KEYS = {
  levelTable: 'levels.table',
  dailyCaps: 'xp.dailyCaps',
  lessonsConfig: 'lessons.config',
  pathConfig: 'path.config',
} as const;

/** How long a loaded GameConfig value is reused before it is read again. */
export const GAME_CONFIG_CACHE_MS = 60_000;

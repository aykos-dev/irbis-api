import type { LevelRow, LevelTable } from './game-config.schema.js';

/** What the level gates look at. Counts are lifetime. */
export interface ProgressState {
  level: number;
  xpTotal: number;
  lessonsTotal: number;
  /** Lesson facts per tier key (lesson facts without a tier are only in `lessonsTotal`). */
  lessonsByTier: Record<string, number>;
  /** Check-in facts per place difficulty (1–5). */
  checkInsByDifficulty: Record<number, number>;
  verifiedSpots: number;
}

export interface LevelStep {
  fromLevel: number;
  toLevel: number;
}

/** Lessons that count toward `row`'s lesson gate. */
export function lessonsDone(row: LevelRow, state: ProgressState): number {
  if (row.lessons.kind === 'tier' && row.lessons.tier !== null) {
    return state.lessonsByTier[row.lessons.tier] ?? 0;
  }
  return state.lessonsTotal;
}

/** Published lessons, per tier key and in total; they size the `tier` and `all` lesson gates. */
export interface PublishedLessonCounts {
  byTier: Record<string, number>;
  total: number;
}

/**
 * The effective table: a `tier` gate requires every published lesson of its tier, an `all` gate
 * every published lesson; `count` gates keep the configured number.
 */
export function withPublishedLessonGates(
  table: LevelTable,
  published: PublishedLessonCounts,
): LevelTable {
  return table.map((row) => {
    if (row.lessons.kind === 'count') return row;
    const required =
      row.lessons.kind === 'tier' && row.lessons.tier !== null
        ? (published.byTier[row.lessons.tier] ?? 0)
        : published.total;
    return { ...row, lessons: { ...row.lessons, required } };
  });
}

/** A `tier`/`all` gate with nothing published is not met; otherwise enough lessons must be done. */
export function lessonGateMet(row: LevelRow, state: ProgressState): boolean {
  if (row.lessons.kind !== 'count' && row.lessons.required === 0) return false;
  return lessonsDone(row, state) >= row.lessons.required;
}

/** Check-ins at places of at least `minDifficulty`. */
export function checkInsAtLeast(
  minDifficulty: number,
  state: ProgressState,
): number {
  return Object.entries(state.checkInsByDifficulty)
    .filter(([difficulty]) => Number(difficulty) >= minDifficulty)
    .reduce((sum, [, n]) => sum + n, 0);
}

/** Every gate of `row` is met: XP, lessons, check-ins and verified spots. */
export function meetsLevel(row: LevelRow, state: ProgressState): boolean {
  return (
    state.xpTotal >= row.xp &&
    lessonGateMet(row, state) &&
    checkInsAtLeast(row.checkIns.minDifficulty, state) >=
      row.checkIns.required &&
    state.verifiedSpots >= row.verifiedSpots
  );
}

/** Levels above the current one that are met, in order, stopping at the first unmet level. */
export function nextReachableLevels(
  table: LevelTable,
  state: ProgressState,
): number[] {
  const reached: number[] = [];
  for (const row of table) {
    if (row.level <= state.level) continue;
    if (!meetsLevel(row, state)) break;
    reached.push(row.level);
  }
  return reached;
}

/** One step per level: 2 → [3, 4] gives 2→3, 3→4. */
export function levelSteps(from: number, levels: number[]): LevelStep[] {
  return levels.map((toLevel, i) => ({
    fromLevel: i === 0 ? from : levels[i - 1],
    toLevel,
  }));
}

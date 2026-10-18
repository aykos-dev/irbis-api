import { levelTable } from '../../../../prisma/seed/game-config.data.js';
import { levelTableSchema } from '../game-config.schema.js';
import {
  levelSteps,
  nextReachableLevels,
  type ProgressState,
} from '../level-engine.js';

const TABLE = levelTableSchema.parse(levelTable);

function state(extra: Partial<ProgressState> = {}): ProgressState {
  return {
    level: 1,
    xpTotal: 0,
    lessonsTotal: 0,
    lessonsByTier: {},
    checkInsByDifficulty: {},
    verifiedSpots: 0,
    ...extra,
  };
}

describe('level engine (AC2)', () => {
  it('XP alone does not level: lessons and check-ins are needed too', () => {
    expect(nextReachableLevels(TABLE, state({ xpTotal: 20_000 }))).toEqual([]);
    expect(
      nextReachableLevels(TABLE, state({ xpTotal: 20_000, lessonsTotal: 2 })),
    ).toEqual([]);
    expect(
      nextReachableLevels(
        TABLE,
        state({
          xpTotal: 20_000,
          lessonsTotal: 2,
          checkInsByDifficulty: { 1: 2 },
        }),
      ),
    ).toEqual([2]);
  });

  it('a jump returns every met level in order and stops at the first unmet one', () => {
    const met = state({
      xpTotal: 1_200,
      lessonsTotal: 8,
      lessonsByTier: { '2': 6 },
      checkInsByDifficulty: { 2: 5 },
    });
    expect(nextReachableLevels(TABLE, met)).toEqual([2, 3]);
    expect(levelSteps(1, [2, 3])).toEqual([
      { fromLevel: 1, toLevel: 2 },
      { fromLevel: 2, toLevel: 3 },
    ]);
    // L3 unmet (no tier-2 lessons) → nothing above it either, even though L4 tier-3 is met.
    expect(
      nextReachableLevels(TABLE, { ...met, lessonsByTier: { '3': 6 } }),
    ).toEqual([2]);
  });

  it('the tier gate counts only lessons of that tier', () => {
    const atL2 = state({
      level: 2,
      xpTotal: 1_000,
      lessonsTotal: 12,
      lessonsByTier: { '1': 6, '3': 6 },
      checkInsByDifficulty: { 2: 5 },
    });
    expect(nextReachableLevels(TABLE, atL2)).toEqual([]);
    expect(
      nextReachableLevels(TABLE, { ...atL2, lessonsByTier: { '2': 6 } }),
    ).toEqual([3]);
  });

  it('check-ins count only at or above the minimum difficulty', () => {
    const atL2 = state({
      level: 2,
      xpTotal: 1_000,
      lessonsTotal: 6,
      lessonsByTier: { '2': 6 },
      checkInsByDifficulty: { 1: 10, 2: 4 },
    });
    expect(nextReachableLevels(TABLE, atL2)).toEqual([]);
    expect(
      nextReachableLevels(TABLE, {
        ...atL2,
        checkInsByDifficulty: { 1: 10, 2: 4, 5: 1 },
      }),
    ).toEqual([3]);
  });

  it('L7 needs 3 verified spots', () => {
    const atL6 = state({
      level: 6,
      xpTotal: 15_000,
      lessonsTotal: 36,
      checkInsByDifficulty: { 5: 25 },
      verifiedSpots: 2,
    });
    expect(nextReachableLevels(TABLE, atL6)).toEqual([]);
    expect(nextReachableLevels(TABLE, { ...atL6, verifiedSpots: 3 })).toEqual([
      7,
    ]);
  });

  it('never returns a level at or below the current one', () => {
    // A level-4 user who no longer meets L2 after a threshold rise.
    expect(nextReachableLevels(TABLE, state({ level: 4 }))).toEqual([]);
  });
});

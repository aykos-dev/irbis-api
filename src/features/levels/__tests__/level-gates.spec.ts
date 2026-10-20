import { levelTable } from '../../../../prisma/seed/game-config.data.js';
import { GameConfigService } from '../game-config.service.js';
import { levelTableSchema } from '../game-config.schema.js';
import {
  nextReachableLevels,
  withPublishedLessonGates,
  type ProgressState,
  type PublishedLessonCounts,
} from '../level-engine.js';
import type { LevelsRepository } from '../levels.repository.js';

const TABLE = levelTableSchema.parse(levelTable);

const atL2: ProgressState = {
  level: 2,
  xpTotal: 20_000,
  lessonsTotal: 3,
  lessonsByTier: { '2': 3 },
  checkInsByDifficulty: { 5: 30 },
  verifiedSpots: 3,
};

describe('level lesson gates from published lessons (AC5)', () => {
  it('a tier gate requires the published lessons of that tier; `all` sums every tier; `count` keeps config', () => {
    const table = withPublishedLessonGates(TABLE, {
      byTier: { '2': 3, '3': 4, 'first-aid': 2 },
      total: 9,
    });
    expect(table.map((row) => row.lessons.required)).toEqual([
      0, 2, 3, 4, 2, 0, 9,
    ]);
    // 3 published tier-2 lessons, all done → L3; L4 (tier 3, 4 published) unmet.
    expect(nextReachableLevels(table, atL2)).toEqual([3]);
  });

  it('a tier with nothing published is an unmet gate, shown as required 0', () => {
    const table = withPublishedLessonGates(TABLE, { byTier: {}, total: 0 });
    expect(table[2].lessons).toEqual({ kind: 'tier', tier: '2', required: 0 });
    expect(nextReachableLevels(table, atL2)).toEqual([]);
  });

  it('GameConfigService serves the effective table, cached ≤ 60 s, recounted after a publish change', async () => {
    let published: PublishedLessonCounts = { byTier: { '2': 6 }, total: 6 };
    const publishedLessonCounts = vi.fn(() => Promise.resolve(published));
    const repository = {
      findGameConfig: () => Promise.resolve({ value: levelTable }),
      publishedLessonCounts,
    } as unknown as LevelsRepository;
    const config = new GameConfigService(repository);

    expect((await config.levelTable(0))[2].lessons.required).toBe(6);
    published = { byTier: { '2': 7 }, total: 7 };
    expect((await config.levelTable(1_000))[2].lessons.required).toBe(6);
    config.invalidatePublishedLessons();
    expect((await config.levelTable(2_000))[2].lessons.required).toBe(7);
    expect(publishedLessonCounts).toHaveBeenCalledTimes(2);
  });
});

import {
  levelTable,
  xpDailyCaps,
} from '../../../../prisma/seed/game-config.data.js';
import { GameConfigService } from '../game-config.service.js';
import { dailyCapsSchema, levelTableSchema } from '../game-config.schema.js';
import { GameConfigInvalidError } from '../levels.errors.js';
import type { LevelsRepository } from '../levels.repository.js';

function service(rows: Record<string, unknown>) {
  const findGameConfig = vi.fn((key: string) =>
    Promise.resolve(key in rows ? { value: rows[key] } : null),
  );
  const repository = { findGameConfig } as unknown as LevelsRepository;
  return { config: new GameConfigService(repository), findGameConfig };
}

describe('GameConfig (AC1/AC2 config)', () => {
  it('accepts the seeded table and caps', () => {
    expect(levelTableSchema.safeParse(levelTable).success).toBe(true);
    expect(dailyCapsSchema.parse(xpDailyCaps)).toEqual({
      post: 5,
      game: 30,
      campfire: 30,
    });
  });

  it('rejects a bad table: wrong length, out of order, xp decreasing, tier without key', () => {
    expect(levelTableSchema.safeParse(levelTable.slice(0, 6)).success).toBe(
      false,
    );
    expect(levelTableSchema.safeParse([...levelTable].reverse()).success).toBe(
      false,
    );
    const dropped = levelTable.map((r) =>
      r.level === 4 ? { ...r, xp: 10 } : r,
    );
    expect(levelTableSchema.safeParse(dropped).success).toBe(false);
    const noTier = levelTable.map((r) =>
      r.level === 3 ? { ...r, lessons: { ...r.lessons, tier: null } } : r,
    );
    expect(levelTableSchema.safeParse(noTier).success).toBe(false);
    expect(dailyCapsSchema.safeParse({ post: -1 }).success).toBe(false);
  });

  it('throws GAME_CONFIG_INVALID for a missing or invalid row, and caches a valid one ≤ 60 s', async () => {
    const missing = service({});
    await expect(missing.config.levelTable()).rejects.toBeInstanceOf(
      GameConfigInvalidError,
    );

    const invalid = service({ 'levels.table': [{ level: 1 }] });
    await expect(invalid.config.levelTable()).rejects.toMatchObject({
      code: 'GAME_CONFIG_INVALID',
      key: 'levels.table',
    });

    const valid = service({ 'levels.table': levelTable });
    await valid.config.levelTable(0);
    await valid.config.levelTable(59_999);
    expect(valid.findGameConfig).toHaveBeenCalledTimes(1);
    await valid.config.levelTable(60_000);
    expect(valid.findGameConfig).toHaveBeenCalledTimes(2);
  });
});

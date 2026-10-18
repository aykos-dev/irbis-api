import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import {
  dailyCapsSchema,
  levelTableSchema,
  type DailyCaps,
  type LevelTable,
} from './game-config.schema.js';
import { GAME_CONFIG_CACHE_MS, GAME_CONFIG_KEYS } from './levels.constants.js';
import { GameConfigInvalidError } from './levels.errors.js';
import { LevelsRepository } from './levels.repository.js';

interface CacheEntry {
  value: unknown;
  loadedAt: number;
}

/** Typed GameConfig loader. Missing or invalid rows throw at use; valid values are reused for ≤ 60 s. */
@Injectable()
export class GameConfigService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly repository: LevelsRepository) {}

  levelTable(now = Date.now()): Promise<LevelTable> {
    return this.load(GAME_CONFIG_KEYS.levelTable, levelTableSchema, now);
  }

  dailyCaps(now = Date.now()): Promise<DailyCaps> {
    return this.load(GAME_CONFIG_KEYS.dailyCaps, dailyCapsSchema, now);
  }

  private async load<S extends z.ZodType>(
    key: string,
    schema: S,
    now: number,
  ): Promise<z.infer<S>> {
    const hit = this.cache.get(key);
    if (hit && now - hit.loadedAt < GAME_CONFIG_CACHE_MS) {
      return hit.value as z.infer<S>;
    }
    const row = await this.repository.findGameConfig(key);
    if (!row) throw new GameConfigInvalidError(key, 'row is missing');
    const parsed = schema.safeParse(row.value);
    if (!parsed.success) {
      throw new GameConfigInvalidError(
        key,
        parsed.error.issues
          .map(
            (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
          )
          .join('; '),
      );
    }
    this.cache.set(key, { value: parsed.data, loadedAt: now });
    return parsed.data;
  }
}

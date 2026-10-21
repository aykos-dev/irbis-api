import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import {
  dailyCapsSchema,
  lessonsConfigSchema,
  levelTableSchema,
  pathConfigSchema,
  tripActiveConfigSchema,
  tripConfigSchema,
  type DailyCaps,
  type LessonsConfig,
  type LevelTable,
  type PathConfig,
  type TripActiveConfig,
  type TripConfig,
} from './game-config.schema.js';
import {
  withPublishedLessonGates,
  type PublishedLessonCounts,
} from './level-engine.js';
import { GAME_CONFIG_CACHE_MS, GAME_CONFIG_KEYS } from './levels.constants.js';
import { GameConfigInvalidError } from './levels.errors.js';
import { LevelsRepository } from './levels.repository.js';

interface CacheEntry {
  value: unknown;
  loadedAt: number;
}

const PUBLISHED_LESSONS_CACHE_KEY = 'lessons.published';

/** Typed GameConfig loader. Missing or invalid rows throw at use; valid values are reused for ≤ 60 s. */
@Injectable()
export class GameConfigService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly repository: LevelsRepository) {}

  /** The effective level table: config rows with `tier`/`all` lesson gates sized by published lessons. */
  async levelTable(now = Date.now()): Promise<LevelTable> {
    const [table, published] = await Promise.all([
      this.load(GAME_CONFIG_KEYS.levelTable, levelTableSchema, now),
      this.publishedLessons(now),
    ]);
    return withPublishedLessonGates(table, published);
  }

  /** Publish / unpublish changed the lesson counts: the next read reloads them. */
  invalidatePublishedLessons(): void {
    this.cache.delete(PUBLISHED_LESSONS_CACHE_KEY);
  }

  dailyCaps(now = Date.now()): Promise<DailyCaps> {
    return this.load(GAME_CONFIG_KEYS.dailyCaps, dailyCapsSchema, now);
  }

  lessonsConfig(now = Date.now()): Promise<LessonsConfig> {
    return this.load(GAME_CONFIG_KEYS.lessonsConfig, lessonsConfigSchema, now);
  }

  pathConfig(now = Date.now()): Promise<PathConfig> {
    return this.load(GAME_CONFIG_KEYS.pathConfig, pathConfigSchema, now);
  }

  tripConfig(now = Date.now()): Promise<TripConfig> {
    return this.load(GAME_CONFIG_KEYS.tripConfig, tripConfigSchema, now);
  }

  tripActiveConfig(now = Date.now()): Promise<TripActiveConfig> {
    return this.load(GAME_CONFIG_KEYS.tripActive, tripActiveConfigSchema, now);
  }

  private async publishedLessons(now: number): Promise<PublishedLessonCounts> {
    const hit = this.cache.get(PUBLISHED_LESSONS_CACHE_KEY);
    if (hit && now - hit.loadedAt < GAME_CONFIG_CACHE_MS) {
      return hit.value as PublishedLessonCounts;
    }
    const value = await this.repository.publishedLessonCounts();
    this.cache.set(PUBLISHED_LESSONS_CACHE_KEY, { value, loadedAt: now });
    return value;
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

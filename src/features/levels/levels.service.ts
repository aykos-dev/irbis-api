import { Injectable } from '@nestjs/common';
import { startOfTashkentDay } from '../../lib/dates.js';
import { GameConfigService } from './game-config.service.js';
import type { LevelTable } from './game-config.schema.js';
import { levelSteps, nextReachableLevels } from './level-engine.js';
import {
  MAX_DIFFICULTY,
  MIN_DIFFICULTY,
  type LevelFactKindCode,
  type XpSourceCode,
} from './levels.constants.js';
import {
  LevelsRepository,
  type FactCounts,
  type LevelFactRecord,
  type LevelUpRecord,
  type Tx,
  type UserProgress,
  type XpEntryRecord,
} from './levels.repository.js';

export interface AwardInput {
  userId: string;
  source: XpSourceCode;
  /** What the XP is for (lesson id, check-in id, …); one award per (userId, source, refId). */
  refId: string;
  amount: number;
}

export interface AwardResult {
  /** The new entry, the existing one for a repeated refId, or null when today's cap is used up. */
  entry: XpEntryRecord | null;
  created: boolean;
  /** True when the daily cap trimmed or blocked this award. */
  capped: boolean;
  levelUps: LevelUpRecord[];
}

export interface FactInput {
  userId: string;
  kind: LevelFactKindCode;
  refId: string;
  /** Lesson tier key (e.g. "2", "first-aid"). */
  tier?: string;
  /** Place difficulty 1–5; required for check-ins. */
  difficulty?: number;
}

export interface FactResult {
  fact: LevelFactRecord;
  created: boolean;
  levelUps: LevelUpRecord[];
}

export interface LevelState {
  level: number;
  xpTotal: number;
  reachedAt: Date;
  counts: FactCounts;
}

/** XP ledger, level facts and the level engine. Other features call `award` and `recordFact`. */
@Injectable()
export class LevelsService {
  constructor(
    private readonly repository: LevelsRepository,
    private readonly config: GameConfigService,
  ) {}

  async award(input: AwardInput, now = new Date()): Promise<AwardResult> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new Error(
        `XP amount must be a positive integer, got ${input.amount}`,
      );
    }
    const [caps, table] = await Promise.all([
      this.config.dailyCaps(),
      this.config.levelTable(),
    ]);
    const key = {
      userId: input.userId,
      source: input.source,
      refId: input.refId,
    };

    return this.repository.transaction(async (tx) => {
      await this.lockUser(input.userId, tx);
      const existing = await this.repository.findXpEntry(key, tx);
      if (existing)
        return { entry: existing, created: false, capped: false, levelUps: [] };

      let amount = input.amount;
      let capped = false;
      const cap = caps[input.source];
      if (cap !== undefined) {
        const used = await this.repository.sumXpSince(
          input.userId,
          input.source,
          startOfTashkentDay(now),
          tx,
        );
        const left = cap - used;
        if (left <= 0)
          return { entry: null, created: false, capped: true, levelUps: [] };
        if (amount > left) {
          amount = left;
          capped = true;
        }
      }

      const entry = await this.repository.insertXpEntry(
        { ...key, amount, createdAt: now },
        tx,
      );
      if (!entry) {
        const raced = await this.repository.findXpEntry(key, tx);
        return { entry: raced, created: false, capped: false, levelUps: [] };
      }
      await this.repository.addXp(input.userId, amount, tx);
      const levelUps = await this.evaluateIn(input.userId, table, now, tx);
      return { entry, created: true, capped, levelUps };
    });
  }

  async recordFact(input: FactInput, now = new Date()): Promise<FactResult> {
    const difficulty = input.difficulty ?? null;
    if (
      difficulty !== null &&
      (!Number.isInteger(difficulty) ||
        difficulty < MIN_DIFFICULTY ||
        difficulty > MAX_DIFFICULTY)
    ) {
      throw new Error(`Difficulty must be an integer 1–5, got ${difficulty}`);
    }
    if (input.kind === 'check_in' && difficulty === null) {
      throw new Error('A check-in fact needs the place difficulty');
    }
    const table = await this.config.levelTable();
    const key = { userId: input.userId, kind: input.kind, refId: input.refId };

    return this.repository.transaction(async (tx) => {
      await this.lockUser(input.userId, tx);
      const existing = await this.repository.findFact(key, tx);
      if (existing) return { fact: existing, created: false, levelUps: [] };

      const fact = await this.repository.insertFact(
        { ...key, tier: input.tier ?? null, difficulty, createdAt: now },
        tx,
      );
      if (!fact) {
        const raced = await this.repository.findFact(key, tx);
        if (!raced)
          throw new Error('Level fact vanished after a unique conflict');
        return { fact: raced, created: false, levelUps: [] };
      }
      const levelUps = await this.evaluateIn(input.userId, table, now, tx);
      return { fact, created: true, levelUps };
    });
  }

  /** Re-checks the level gates and writes any level-ups the user now qualifies for. */
  async evaluate(userId: string, now = new Date()): Promise<LevelUpRecord[]> {
    const table = await this.config.levelTable();
    return this.repository.transaction(async (tx) => {
      await this.lockUser(userId, tx);
      return this.evaluateIn(userId, table, now, tx);
    });
  }

  async getState(userId: string): Promise<LevelState> {
    const [progress, counts] = await Promise.all([
      this.repository.findProgress(userId),
      this.repository.factCounts(userId),
    ]);
    if (!progress) throw new Error(`User ${userId} not found`);
    return {
      level: progress.level,
      xpTotal: progress.xpTotal,
      reachedAt: progress.levelReachedAt,
      counts,
    };
  }

  private async lockUser(userId: string, tx: Tx): Promise<UserProgress> {
    const progress = await this.repository.lockUser(userId, tx);
    if (!progress) throw new Error(`User ${userId} not found`);
    return progress;
  }

  private async evaluateIn(
    userId: string,
    table: LevelTable,
    now: Date,
    tx: Tx,
  ): Promise<LevelUpRecord[]> {
    const progress = await this.repository.findProgress(userId, tx);
    if (!progress) throw new Error(`User ${userId} not found`);
    const counts = await this.repository.factCounts(userId, tx);
    const levels = nextReachableLevels(table, {
      level: progress.level,
      xpTotal: progress.xpTotal,
      ...counts,
    });
    if (levels.length === 0) return [];
    return this.repository.applyLevelUps(
      userId,
      levelSteps(progress.level, levels),
      now,
      tx,
    );
  }
}

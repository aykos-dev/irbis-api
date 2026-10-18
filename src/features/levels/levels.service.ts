import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { startOfTashkentDay } from '../../lib/dates.js';
import { GameConfigService } from './game-config.service.js';
import type { LevelRow, LevelTable } from './game-config.schema.js';
import type {
  LevelDefDto,
  LevelListResponseDto,
  MyLevelDto,
  NextLevelDto,
} from './dto/levels.response.dto.js';
import {
  checkInsAtLeast,
  levelSteps,
  lessonsDone,
  nextReachableLevels,
  type ProgressState,
} from './level-engine.js';
import {
  MAX_DIFFICULTY,
  MIN_DIFFICULTY,
  type LevelFactKindCode,
  type XpSourceCode,
} from './levels.constants.js';
import { LevelUpNotFoundError } from './levels.errors.js';
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

/** What a QA grant writes; every item becomes its own `qa:<uuid>` ledger row or fact. */
export interface QaGrantInput {
  xp?: number;
  lessons?: { tier: string }[];
  checkIns?: { difficulty: number }[];
  verifiedSpots?: number;
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

  /** The level table with how many places each level opens. */
  async listLevels(): Promise<LevelListResponseDto> {
    const [table, places] = await Promise.all([
      this.config.levelTable(),
      this.repository.placeCountsByRequiredLevel(),
    ]);
    return { items: table.map((row) => toLevelDef(row, places)) };
  }

  /** The user's level, bars toward the next one and unseen level-ups. */
  async getMyLevel(userId: string): Promise<MyLevelDto> {
    const [table, places, state, pending] = await Promise.all([
      this.config.levelTable(),
      this.repository.placeCountsByRequiredLevel(),
      this.getState(userId),
      this.repository.pendingLevelUps(userId),
    ]);
    const progress: ProgressState = {
      level: state.level,
      xpTotal: state.xpTotal,
      ...state.counts,
    };
    const nextRow = table.find((row) => row.level === state.level + 1);
    return {
      level: state.level,
      xpTotal: state.xpTotal,
      reachedAt: state.reachedAt.toISOString(),
      next: nextRow ? toNextLevel(nextRow, progress) : null,
      pendingLevelUps: pending.map((levelUp) => ({
        id: levelUp.id,
        fromLevel: levelUp.fromLevel,
        toLevel: levelUp.toLevel,
        maxDifficulty:
          table.find((row) => row.level === levelUp.toLevel)?.maxDifficulty ??
          MIN_DIFFICULTY,
        newPlacesCount: places[levelUp.toLevel] ?? 0,
      })),
    };
  }

  /** Marks the user's level-up as seen; repeating it is a no-op. */
  async markLevelUpSeen(
    userId: string,
    id: string,
    now = new Date(),
  ): Promise<void> {
    const found = await this.repository.markLevelUpSeen(userId, id, now);
    if (!found) throw new LevelUpNotFoundError();
  }

  /** QA only: grants XP and facts through the normal ledger, so caps and level-ups apply. */
  async grantForQa(
    userId: string,
    grant: QaGrantInput,
    now = new Date(),
  ): Promise<MyLevelDto> {
    const refId = (): string => `qa:${randomUUID()}`;
    if (grant.xp !== undefined) {
      await this.award(
        { userId, source: 'qa_grant', refId: refId(), amount: grant.xp },
        now,
      );
    }
    for (const lesson of grant.lessons ?? []) {
      await this.recordFact(
        { userId, kind: 'lesson', refId: refId(), tier: lesson.tier },
        now,
      );
    }
    for (const checkIn of grant.checkIns ?? []) {
      await this.recordFact(
        {
          userId,
          kind: 'check_in',
          refId: refId(),
          difficulty: checkIn.difficulty,
        },
        now,
      );
    }
    for (let i = 0; i < (grant.verifiedSpots ?? 0); i += 1) {
      await this.recordFact(
        { userId, kind: 'verified_spot', refId: refId() },
        now,
      );
    }
    return this.getMyLevel(userId);
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

function toLevelDef(
  row: LevelRow,
  places: Record<number, number>,
): LevelDefDto {
  return {
    level: row.level,
    xp: row.xp,
    lessons: { ...row.lessons },
    checkIns: { ...row.checkIns },
    verifiedSpots: row.verifiedSpots,
    maxDifficulty: row.maxDifficulty,
    newPlacesCount: places[row.level] ?? 0,
  };
}

/** Progress bars toward `row`, counted with the same rules as the level gates. */
function toNextLevel(row: LevelRow, state: ProgressState): NextLevelDto {
  return {
    level: row.level,
    xp: { current: state.xpTotal, required: row.xp },
    lessons: {
      current: lessonsDone(row, state),
      required: row.lessons.required,
      kind: row.lessons.kind,
      tier: row.lessons.tier,
    },
    checkIns: {
      current: checkInsAtLeast(row.checkIns.minDifficulty, state),
      required: row.checkIns.required,
      minDifficulty: row.checkIns.minDifficulty,
    },
    verifiedSpots:
      row.verifiedSpots === 0
        ? null
        : { current: state.verifiedSpots, required: row.verifiedSpots },
  };
}

import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { LevelFactKindCode, XpSourceCode } from './levels.constants.js';

/** Handle of an open database transaction; opaque to services. */
export type Tx = Prisma.TransactionClient;

export interface UserProgress {
  level: number;
  xpTotal: number;
  levelReachedAt: Date;
}

export interface XpEntryRecord {
  id: string;
  userId: string;
  source: XpSourceCode;
  refId: string;
  amount: number;
  createdAt: Date;
}

export interface LevelFactRecord {
  id: string;
  userId: string;
  kind: LevelFactKindCode;
  refId: string;
  tier: string | null;
  difficulty: number | null;
  createdAt: Date;
}

export interface LevelUpRecord {
  id: string;
  userId: string;
  fromLevel: number;
  toLevel: number;
  createdAt: Date;
  seenAt: Date | null;
}

export interface FactCounts {
  lessonsTotal: number;
  lessonsByTier: Record<string, number>;
  checkInsByDifficulty: Record<number, number>;
  verifiedSpots: number;
}

export interface XpKey {
  userId: string;
  source: XpSourceCode;
  refId: string;
}

export interface FactKey {
  userId: string;
  kind: LevelFactKindCode;
  refId: string;
}

const progressSelect = {
  level: true,
  xpTotal: true,
  levelReachedAt: true,
} as const;

/** GameConfig rows, the XP ledger, level facts and level-ups. */
@Injectable()
export class LevelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  async findGameConfig(key: string): Promise<{ value: unknown } | null> {
    return this.prisma.gameConfig.findUnique({
      where: { key },
      select: { value: true },
    });
  }

  /** Locks the user row until the transaction ends (serialises awards, caps and level-ups per user). */
  async lockUser(userId: string, tx: Tx): Promise<UserProgress | null> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
    if (rows.length === 0) return null;
    return this.findProgress(userId, tx);
  }

  findProgress(userId: string, tx?: Tx): Promise<UserProgress | null> {
    return (tx ?? this.prisma).user.findUnique({
      where: { id: userId },
      select: progressSelect,
    });
  }

  findXpEntry(key: XpKey, tx: Tx): Promise<XpEntryRecord | null> {
    return tx.xpEntry.findUnique({ where: { userId_source_refId: key } });
  }

  async sumXpSince(
    userId: string,
    source: XpSourceCode,
    since: Date,
    tx: Tx,
  ): Promise<number> {
    const result = await tx.xpEntry.aggregate({
      where: { userId, source, createdAt: { gte: since } },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  /** Inserts unless (userId, source, refId) exists; the unique constraint decides, so a lost race returns null. */
  async insertXpEntry(
    data: XpKey & { amount: number; createdAt: Date },
    tx: Tx,
  ): Promise<XpEntryRecord | null> {
    const rows = await tx.xpEntry.createManyAndReturn({
      data: [data],
      skipDuplicates: true,
    });
    return rows[0] ?? null;
  }

  async addXp(userId: string, amount: number, tx: Tx): Promise<void> {
    await tx.user.update({
      where: { id: userId },
      data: { xpTotal: { increment: amount } },
    });
  }

  findFact(key: FactKey, tx: Tx): Promise<LevelFactRecord | null> {
    return tx.levelFact.findUnique({ where: { userId_kind_refId: key } });
  }

  /** Inserts unless (userId, kind, refId) exists; a lost race returns null. */
  async insertFact(
    data: FactKey & {
      tier: string | null;
      difficulty: number | null;
      createdAt: Date;
    },
    tx: Tx,
  ): Promise<LevelFactRecord | null> {
    const rows = await tx.levelFact.createManyAndReturn({
      data: [data],
      skipDuplicates: true,
    });
    return rows[0] ?? null;
  }

  async factCounts(userId: string, tx?: Tx): Promise<FactCounts> {
    const groups = await (tx ?? this.prisma).levelFact.groupBy({
      by: ['kind', 'tier', 'difficulty'],
      where: { userId },
      _count: { _all: true },
    });
    const counts: FactCounts = {
      lessonsTotal: 0,
      lessonsByTier: {},
      checkInsByDifficulty: {},
      verifiedSpots: 0,
    };
    for (const group of groups) {
      const n = group._count._all;
      if (group.kind === 'lesson') {
        counts.lessonsTotal += n;
        if (group.tier !== null) {
          counts.lessonsByTier[group.tier] =
            (counts.lessonsByTier[group.tier] ?? 0) + n;
        }
      } else if (group.kind === 'check_in' && group.difficulty !== null) {
        counts.checkInsByDifficulty[group.difficulty] =
          (counts.checkInsByDifficulty[group.difficulty] ?? 0) + n;
      } else if (group.kind === 'verified_spot') {
        counts.verifiedSpots += n;
      }
    }
    return counts;
  }

  /** Writes one LevelUp per step and moves the user to the last step's level. */
  async applyLevelUps(
    userId: string,
    steps: { fromLevel: number; toLevel: number }[],
    at: Date,
    tx: Tx,
  ): Promise<LevelUpRecord[]> {
    const rows = await tx.levelUp.createManyAndReturn({
      data: steps.map((step) => ({ userId, ...step, createdAt: at })),
    });
    await tx.user.update({
      where: { id: userId },
      data: { level: steps[steps.length - 1].toLevel, levelReachedAt: at },
    });
    return rows.sort((a, b) => a.toLevel - b.toLevel);
  }

  /** Unseen level-ups, oldest first. */
  pendingLevelUps(userId: string): Promise<LevelUpRecord[]> {
    return this.prisma.levelUp.findMany({
      where: { userId, seenAt: null },
      orderBy: [{ createdAt: 'asc' }, { toLevel: 'asc' }],
    });
  }

  /** Sets `seenAt` once. False when the level-up does not exist or belongs to someone else. */
  async markLevelUpSeen(
    userId: string,
    id: string,
    at: Date,
  ): Promise<boolean> {
    const updated = await this.prisma.levelUp.updateMany({
      where: { id, userId, seenAt: null },
      data: { seenAt: at },
    });
    if (updated.count > 0) return true;
    const existing = await this.prisma.levelUp.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    return existing !== null;
  }

  /** Number of places per required level. */
  async placeCountsByRequiredLevel(): Promise<Record<number, number>> {
    const groups = await this.prisma.place.groupBy({
      by: ['requiredLevel'],
      _count: { _all: true },
    });
    const counts: Record<number, number> = {};
    for (const group of groups) {
      counts[group.requiredLevel] = group._count._all;
    }
    return counts;
  }
}

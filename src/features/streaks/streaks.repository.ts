import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  ActivityDayInput,
  ActivityKind,
  FreezeUse,
  StreakSnapshot,
} from './streaks.rules.js';

const toDbDate = (day: string): Date => new Date(`${day}T00:00:00Z`);
const fromDbDate = (date: Date): string => date.toISOString().slice(0, 10);
const fromDbDateOrNull = (date: Date | null): string | null =>
  date === null ? null : fromDbDate(date);

/** One user's streak rows, read and written inside a transaction holding that user's lock. */
export class StreaksStore {
  constructor(
    private readonly tx: Prisma.TransactionClient,
    private readonly userId: string,
  ) {}

  async findState(): Promise<StreakSnapshot | null> {
    const row = await this.tx.streakState.findUnique({
      where: { userId: this.userId },
    });
    if (!row) return null;
    return {
      flameCount: row.flameCount,
      flameLastDay: fromDbDateOrNull(row.flameLastDay),
      bootCount: row.bootCount,
      bootLastWeek: fromDbDateOrNull(row.bootLastWeek),
      evaluatedThrough: fromDbDateOrNull(row.evaluatedThrough),
    };
  }

  /** Activity days from `from` on (all of them when `from` is null), oldest first. */
  async activitySince(from: string | null): Promise<ActivityDayInput[]> {
    const rows = await this.tx.activityDay.findMany({
      where: {
        userId: this.userId,
        ...(from === null ? {} : { day: { gte: toDbDate(from) } }),
      },
      orderBy: { day: 'asc' },
      select: { day: true, lessons: true, checkIns: true },
    });
    return rows.map((row) => ({ ...row, day: fromDbDate(row.day) }));
  }

  async freezes(): Promise<FreezeUse[]> {
    const rows = await this.tx.streakFreeze.findMany({
      where: { userId: this.userId },
      orderBy: { coversDate: 'asc' },
      select: { kind: true, coversDate: true, month: true },
    });
    return rows.map((row) => ({
      kind: row.kind,
      date: fromDbDate(row.coversDate),
      month: row.month,
    }));
  }

  /** Drops the evaluation (state + freezes) so it is replayed from the activity days. */
  async reset(): Promise<void> {
    await this.tx.streakFreeze.deleteMany({ where: { userId: this.userId } });
    await this.tx.streakState.deleteMany({ where: { userId: this.userId } });
  }

  async save(
    state: StreakSnapshot,
    newFreezes: readonly FreezeUse[],
  ): Promise<void> {
    const data = {
      flameCount: state.flameCount,
      flameLastDay:
        state.flameLastDay === null ? null : toDbDate(state.flameLastDay),
      bootCount: state.bootCount,
      bootLastWeek:
        state.bootLastWeek === null ? null : toDbDate(state.bootLastWeek),
      evaluatedThrough:
        state.evaluatedThrough === null
          ? null
          : toDbDate(state.evaluatedThrough),
    };
    await this.tx.streakState.upsert({
      where: { userId: this.userId },
      create: { userId: this.userId, ...data },
      update: data,
    });
    if (newFreezes.length > 0) {
      await this.tx.streakFreeze.createMany({
        data: newFreezes.map((freeze) => ({
          userId: this.userId,
          kind: freeze.kind,
          coversDate: toDbDate(freeze.date),
          month: freeze.month,
        })),
      });
    }
  }
}

@Injectable()
export class StreaksRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** +1 lesson or check-in on the user's Tashkent day. */
  async addActivity(
    userId: string,
    day: string,
    kind: ActivityKind,
  ): Promise<void> {
    const field = kind === 'lesson' ? 'lessons' : 'checkIns';
    await this.prisma.activityDay.upsert({
      where: { userId_day: { userId, day: toDbDate(day) } },
      create: { userId, day: toDbDate(day), [field]: 1 },
      update: { [field]: { increment: 1 } },
    });
  }

  /** Runs `work` in one transaction that holds a per-user advisory lock (evaluations never interleave). */
  locked<T>(
    userId: string,
    work: (store: StreaksStore) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('streaks'), hashtext(${userId}))`;
      return work(new StreaksStore(tx, userId));
    });
  }
}

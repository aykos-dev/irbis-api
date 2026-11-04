import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ConditionStatusCode } from '../conditions/conditions.constants.js';
import {
  addDays,
  monthOf,
  type ActivityDayInput,
  type ActivityKind,
  type FreezeUse,
  type StreakSnapshot,
  type WeekendConditionRow,
} from './streaks.rules.js';

const toDbDate = (day: string): Date => new Date(`${day}T00:00:00Z`);
const fromDbDate = (date: Date): string => date.toISOString().slice(0, 10);
/** 00:00 Asia/Tashkent (UTC+5, no DST) of a `YYYY-MM-DD` day, as a UTC instant. */
const tashkentStart = (day: string): Date => new Date(`${day}T00:00:00+05:00`);
const distinct = (ids: readonly string[]): string[] => [...new Set(ids)];
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

  /**
   * AC3: places of the user's path for the month of `saturday` plus places of the user's trips
   * whose [startAt, backBy] overlaps that Saturday or the Sunday after it.
   */
  async weekendPlacesOf(userId: string, saturday: string): Promise<string[]> {
    const [nodes, trips] = await Promise.all([
      this.prisma.pathNode.findMany({
        where: { pathMonth: { userId, month: monthOf(saturday) } },
        select: { placeId: true },
      }),
      this.prisma.trip.findMany({
        where: {
          userId,
          startAt: { lt: tashkentStart(addDays(saturday, 2)) },
          backBy: { gt: tashkentStart(saturday) },
        },
        select: { placeId: true },
      }),
    ]);
    return distinct([...nodes, ...trips].map((row) => row.placeId));
  }

  /** AC3 job: places on any user's path for the month of `day` plus places of trips overlapping `day`. */
  async weekendPlacesOn(day: string): Promise<string[]> {
    const [nodes, trips] = await Promise.all([
      this.prisma.pathNode.findMany({
        where: { pathMonth: { month: monthOf(day) } },
        select: { placeId: true },
        distinct: ['placeId'],
      }),
      this.prisma.trip.findMany({
        where: {
          startAt: { lt: tashkentStart(addDays(day, 1)) },
          backBy: { gt: tashkentStart(day) },
        },
        select: { placeId: true },
        distinct: ['placeId'],
      }),
    ]);
    return distinct([...nodes, ...trips].map((row) => row.placeId));
  }

  /** Current condition status per place; places without a status are left out. */
  async currentStatuses(
    placeIds: readonly string[],
  ): Promise<{ placeId: string; status: ConditionStatusCode }[]> {
    const rows = await this.prisma.placeCondition.findMany({
      where: { placeId: { in: [...placeIds] }, status: { not: null } },
      select: { placeId: true, status: true },
    });
    return rows.flatMap((row) =>
      row.status === null ? [] : [{ placeId: row.placeId, status: row.status }],
    );
  }

  /** Upserts the `day` row of every place (a rerun the same day overwrites). */
  async saveWeekendConditions(
    day: string,
    rows: readonly { placeId: string; status: ConditionStatusCode }[],
  ): Promise<void> {
    const date = toDbDate(day);
    await this.prisma.$transaction(
      rows.map((row) =>
        this.prisma.weekendCondition.upsert({
          where: { placeId_date: { placeId: row.placeId, date } },
          create: { placeId: row.placeId, date, status: row.status },
          update: { status: row.status, recordedAt: new Date() },
        }),
      ),
    );
  }

  async weekendConditions(
    placeIds: readonly string[],
    days: readonly string[],
  ): Promise<WeekendConditionRow[]> {
    const rows = await this.prisma.weekendCondition.findMany({
      where: {
        placeId: { in: [...placeIds] },
        date: { in: days.map(toDbDate) },
      },
      select: { placeId: true, date: true, status: true },
    });
    return rows.map((row) => ({ ...row, date: fromDbDate(row.date) }));
  }
}

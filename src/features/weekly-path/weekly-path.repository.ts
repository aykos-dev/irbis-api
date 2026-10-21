import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { InterestCode } from '../auth/auth.constants.js';
import type { OpenMeteoDaily } from '../conditions/condition.rules.js';
import type { Reason } from '../conditions/conditions.constants.js';
import type { PathPlace } from './path.picker.js';

export interface StoredPathNode {
  position: number;
  placeId: string;
  visitedAt: Date | null;
}

export interface StoredPathMonth {
  level: number;
  chestOpenedAt: Date | null;
  nodes: StoredPathNode[];
}

export interface NewPathMonth {
  userId: string;
  month: string;
  level: number;
  /** In path order: position 1..n. */
  placeIds: string[];
}

const pathMonthSelect = {
  level: true,
  chestOpenedAt: true,
  nodes: {
    orderBy: { position: 'asc' },
    select: { position: true, placeId: true, visitedAt: true },
  },
} as const satisfies Prisma.PathMonthSelect;

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

@Injectable()
export class WeeklyPathRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Every place with its current condition and whether a closure is active at `now`. */
  async listPlaces(now: Date): Promise<PathPlace[]> {
    const rows = await this.prisma.place.findMany({
      orderBy: { slug: 'asc' },
      select: {
        id: true,
        slug: true,
        nameUz: true,
        nameRu: true,
        nameEn: true,
        type: true,
        difficulty: true,
        requiredLevel: true,
        elevationM: true,
        latitude: true,
        longitude: true,
        season: true,
        condition: { select: { status: true, reasons: true } },
        closures: {
          where: {
            endedAt: null,
            startsAt: { lte: now },
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          },
          take: 1,
          select: { id: true },
        },
      },
    });
    return rows.map(({ condition, closures, ...place }) => ({
      ...place,
      closed: closures.length > 0,
      status: condition?.status ?? null,
      reasons: (condition?.reasons ?? []) as unknown as Reason[],
    }));
  }

  async findInterests(userId: string): Promise<InterestCode[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { interests: true },
    });
    return user?.interests ?? [];
  }

  findPathMonth(
    userId: string,
    month: string,
  ): Promise<StoredPathMonth | null> {
    return this.prisma.pathMonth.findUnique({
      where: { userId_month: { userId, month } },
      select: pathMonthSelect,
    });
  }

  /** Stores the month with its nodes in one write. Null when the month already exists (a race). */
  async createPathMonth(data: NewPathMonth): Promise<StoredPathMonth | null> {
    try {
      return await this.prisma.pathMonth.create({
        data: {
          userId: data.userId,
          month: data.month,
          level: data.level,
          nodes: {
            create: data.placeIds.map((placeId, i) => ({
              placeId,
              position: i + 1,
            })),
          },
        },
        select: pathMonthSelect,
      });
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  }

  /** The node of `placeId` in the user's path for `month`, or null (no path, or not on it). */
  findPathNode(
    userId: string,
    month: string,
    placeId: string,
  ): Promise<{ id: string; visitedAt: Date | null } | null> {
    return this.prisma.pathNode.findFirst({
      where: { placeId, pathMonth: { userId, month } },
      select: { id: true, visitedAt: true },
    });
  }

  /** Sets `visitedAt` only while it is still null. True when this call set it. */
  async markNodeVisited(nodeId: string, at: Date): Promise<boolean> {
    const { count } = await this.prisma.pathNode.updateMany({
      where: { id: nodeId, visitedAt: null },
      data: { visitedAt: at },
    });
    return count > 0;
  }

  /** Sets `chestOpenedAt` only while it is still null. */
  async markChestOpened(
    userId: string,
    month: string,
    at: Date,
  ): Promise<void> {
    await this.prisma.pathMonth.updateMany({
      where: { userId, month, chestOpenedAt: null },
      data: { chestOpenedAt: at },
    });
  }

  async findPointForecast(key: string): Promise<OpenMeteoDaily | null> {
    const row = await this.prisma.pointForecast.findUnique({
      where: { key },
      select: { daily: true },
    });
    return row ? (row.daily as unknown as OpenMeteoDaily) : null;
  }

  async savePointForecast(
    key: string,
    daily: OpenMeteoDaily,
    fetchedAt: Date,
  ): Promise<void> {
    const value = daily as unknown as Prisma.InputJsonValue;
    await this.prisma.pointForecast.upsert({
      where: { key },
      create: { key, daily: value, fetchedAt },
      update: { daily: value, fetchedAt },
    });
  }
}

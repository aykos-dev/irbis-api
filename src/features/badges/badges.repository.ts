import { Injectable } from '@nestjs/common';
import type { PlaceType } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BADGES_DEFAULT_START_AT } from './badges.constants.js';

export interface CheckInFact {
  placeId: string;
  month: string;
  recordedAt: Date;
  type: PlaceType;
  elevationM: number;
  region: string | null;
  latitude: number;
  longitude: number;
}

export interface TripFact {
  distanceM: number;
  climbM: number;
  startAt: Date;
  checkedOutAt: Date | null;
  alertSentAt: Date | null;
  createdAt: Date;
}

export interface BadgeFacts {
  startAt: Date;
  checkIns: CheckInFact[];
  trips: TripFact[];
  lessons: number;
  waypoints: number;
  plannedTrips: number;
  chests: number;
  level: number;
  levelReachedAt: Date;
  activityDays: Date[];
  groupTrips: number;
  buddyRatings: number;
  topShotWins: number;
  verifiedSpots: number;
}

export interface BadgeAwardRow {
  key: string;
  earnedAt: Date;
  showcaseOrder: number | null;
}

export interface PublicBadgeUser {
  id: string;
  username: string;
  publicProfile: boolean;
  blockedAt: Date | null;
  deletedAt: Date | null;
}

/** Badge facts, awards and the profile showcase. All reads are bounded by the release cutoff. */
@Injectable()
export class BadgesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The owner-set release cutoff; badges only count activity on or after it. */
  async startAt(): Promise<Date> {
    const row = await this.prisma.gameConfig.findUnique({
      where: { key: 'badges.config' },
      select: { value: true },
    });
    const value = row?.value as { startAt?: unknown } | null | undefined;
    const raw = typeof value?.startAt === 'string' ? value.startAt : BADGES_DEFAULT_START_AT;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? new Date(BADGES_DEFAULT_START_AT) : parsed;
  }

  async facts(userId: string): Promise<BadgeFacts> {
    const startAt = await this.startAt();
    const since = { gte: startAt };
    const [
      checkIns,
      trips,
      lessons,
      waypoints,
      plannedTrips,
      chests,
      user,
      activityDays,
      groupTrips,
      buddyRatings,
      topShotWins,
      verifiedSpots,
    ] = await Promise.all([
      this.prisma.checkIn.findMany({
        where: { userId, counted: true, createdAt: since },
        select: {
          placeId: true,
          month: true,
          recordedAt: true,
          place: {
            select: {
              type: true,
              elevationM: true,
              region: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      }),
      this.prisma.trip.findMany({
        where: { userId, checkedOutAt: since },
        select: {
          distanceM: true,
          climbM: true,
          startAt: true,
          checkedOutAt: true,
          alertSentAt: true,
          createdAt: true,
        },
      }),
      this.prisma.lessonCompletion.count({ where: { userId, createdAt: since } }),
      this.prisma.tripWaypoint.count({
        where: { trip: { userId }, createdAt: since },
      }),
      this.prisma.trip.count({ where: { userId, createdAt: since } }),
      this.prisma.pathMonth.count({
        where: { userId, chestOpenedAt: since },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { level: true, levelReachedAt: true },
      }),
      this.prisma.activityDay.findMany({
        where: { userId, day: { gte: startAt } },
        select: { day: true },
        orderBy: { day: 'asc' },
      }),
      // Producers for these arrive with groups, ratings, Top Shots and add-a-spot.
      Promise.resolve(0),
      Promise.resolve(0),
      Promise.resolve(0),
      this.prisma.levelFact.count({
        where: { userId, kind: 'verified_spot', createdAt: since },
      }),
    ]);

    return {
      startAt,
      checkIns: checkIns.map(row => ({
        placeId: row.placeId,
        month: row.month,
        recordedAt: row.recordedAt,
        type: row.place.type,
        elevationM: row.place.elevationM,
        region: row.place.region,
        latitude: row.place.latitude,
        longitude: row.place.longitude,
      })),
      trips: trips.map(row => ({
        distanceM: row.distanceM,
        climbM: row.climbM,
        startAt: row.startAt,
        checkedOutAt: row.checkedOutAt,
        alertSentAt: row.alertSentAt,
        createdAt: row.createdAt,
      })),
      lessons,
      waypoints,
      plannedTrips,
      chests,
      level: user?.level ?? 1,
      levelReachedAt: user?.levelReachedAt ?? startAt,
      activityDays: activityDays.map(row => row.day),
      groupTrips,
      buddyRatings,
      topShotWins,
      verifiedSpots,
    };
  }

  awards(userId: string): Promise<BadgeAwardRow[]> {
    return this.prisma.badgeAward.findMany({
      where: { userId },
      select: { key: true, earnedAt: true, showcaseOrder: true },
      orderBy: [{ earnedAt: 'asc' }, { key: 'asc' }],
    });
  }

  async insertAwards(userId: string, keys: string[], earnedAt: Date): Promise<void> {
    if (keys.length === 0) return;
    await this.prisma.badgeAward.createMany({
      data: keys.map(key => ({ userId, key, earnedAt })),
      skipDuplicates: true,
    });
  }

  /** Replaces the profile showcase atomically. */
  async setShowcase(userId: string, keys: string[]): Promise<void> {
    await this.prisma.$transaction(async tx => {
      await tx.badgeAward.updateMany({
        where: { userId },
        data: { showcaseOrder: null },
      });
      for (const [index, key] of keys.entries()) {
        await tx.badgeAward.update({
          where: { userId_key: { userId, key } },
          data: { showcaseOrder: index + 1 },
        });
      }
    });
  }

  async publicUser(username: string): Promise<PublicBadgeUser | null> {
    return this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        publicProfile: true,
        blockedAt: true,
        deletedAt: true,
      },
    });
  }

  /** Earned awards for a public profile, showcase first. */
  async publicAwards(userId: string): Promise<BadgeAwardRow[]> {
    return this.prisma.badgeAward.findMany({
      where: { userId },
      select: { key: true, earnedAt: true, showcaseOrder: true },
      orderBy: [{ showcaseOrder: 'asc' }, { earnedAt: 'desc' }],
      take: 4,
    });
  }
}

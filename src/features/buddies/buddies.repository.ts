import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { HomeRegionCode } from '../../common/profile.constants.js';
import type { InterestCode } from '../auth/auth.constants.js';
import type { BuddyLinkStatusCode } from './buddies.constants.js';
import type { RatingAggregate } from './buddies.rules.js';

export interface BuddyUserRow {
  id: string;
  username: string;
  displayName: string | null;
  avatarKey: string | null;
  level: number;
}

export interface CallerRow {
  id: string;
  level: number;
  isDemo: boolean;
  username: string;
  displayName: string | null;
}

export interface TargetRow {
  id: string;
  isDemo: boolean;
  deletedAt: Date | null;
  blockedAt: Date | null;
}

export interface LinkRow {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: BuddyLinkStatusCode;
  createdAt: Date;
  requester: BuddyUserRow;
  addressee: BuddyUserRow;
}

export interface CandidateRow extends BuddyUserRow {
  lastActiveAt: Date;
  interests: InterestCode[];
  homeRegion: HomeRegionCode | null;
  showHomeRegion: boolean;
}

export interface CandidateFilter {
  viewerId: string;
  activeSince: Date;
  level: { min?: number; max?: number };
  region?: HomeRegionCode;
  interests?: InterestCode[];
  /** Only people free Sat or Sun in this week. */
  freeWeek?: Date;
  take: number;
}

export interface Availability {
  sat: boolean;
  sun: boolean;
}

/** A social notification written in the same transaction as the change it reports. */
export interface BuddyNotice {
  userId: string;
  kind: string;
  title: { uz: string; ru: string; en: string };
  data: Record<string, string>;
}

export interface PlaceNames {
  nameUz: string;
  nameRu: string | null;
  nameEn: string | null;
}

export interface BuddyTripRow {
  id: string;
  startAt: Date;
  maxPeople: number | null;
  place: PlaceNames;
  _count: { members: number };
  members: { user: BuddyUserRow }[];
}

export interface RatingTripRow {
  id: string;
  startAt: Date;
  backBy: Date;
  place: PlaceNames;
  /** Members with attendance only. */
  members: { user: BuddyUserRow }[];
}

export interface ScoreRow {
  rateeId: string;
  reliable: number;
  safety: number;
  company: number;
}

const userSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarKey: true,
  level: true,
} satisfies Prisma.UserSelect;

const linkInclude = {
  requester: { select: userSelect },
  addressee: { select: userSelect },
} satisfies Prisma.BuddyLinkInclude;

const placeNames = {
  select: { nameUz: true, nameRu: true, nameEn: true },
} as const;

const visibleUser = {
  deletedAt: null,
  blockedAt: null,
} satisfies Prisma.UserWhereInput;

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

/** The only Prisma user for buddy links, availability and trip ratings. */
@Injectable()
export class BuddiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCaller(userId: string): Promise<CallerRow | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        level: true,
        isDemo: true,
        username: true,
        displayName: true,
      },
    });
  }

  findTarget(userId: string): Promise<TargetRow | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isDemo: true, deletedAt: true, blockedAt: true },
    });
  }

  findLinkByPair(key: string): Promise<LinkRow | null> {
    return this.prisma.buddyLink.findUnique({
      where: { pairKey: key },
      include: linkInclude,
    });
  }

  findLink(id: string): Promise<LinkRow | null> {
    return this.prisma.buddyLink.findUnique({
      where: { id },
      include: linkInclude,
    });
  }

  /** Null when the pair already has a link (a concurrent request won). */
  async createLink(
    requesterId: string,
    addresseeId: string,
    key: string,
    notice: BuddyNotice,
  ): Promise<LinkRow | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const link = await tx.buddyLink.create({
          data: { requesterId, addresseeId, pairKey: key, status: 'pending' },
          include: linkInclude,
        });
        await tx.notification.create({
          data: this.notification(notice, { linkId: link.id }),
        });
        return link;
      });
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  }

  /** pending → accepted; null when it was no longer pending. */
  async acceptLink(
    id: string,
    now: Date,
    notice: BuddyNotice,
  ): Promise<LinkRow | null> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.buddyLink.updateMany({
        where: { id, status: 'pending' },
        data: { status: 'accepted', acceptedAt: now },
      });
      if (count === 0) return null;
      await tx.notification.create({
        data: this.notification(notice, { linkId: id }),
      });
      return tx.buddyLink.findUnique({ where: { id }, include: linkInclude });
    });
  }

  async deleteLink(id: string): Promise<void> {
    await this.prisma.buddyLink.deleteMany({ where: { id } });
  }

  /** Every link touching the user whose other side is still a visible account. */
  listLinks(userId: string): Promise<LinkRow[]> {
    return this.prisma.buddyLink.findMany({
      where: {
        OR: [
          { requesterId: userId, addressee: visibleUser },
          { addresseeId: userId, requester: visibleUser },
        ],
      },
      include: linkInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  /** AC5: accepted links with a visible account on the other side. */
  countBuddies(userId: string): Promise<number> {
    return this.prisma.buddyLink.count({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: userId, addressee: visibleUser },
          { addresseeId: userId, requester: visibleUser },
        ],
      },
    });
  }

  /** AC1/AC2 filters in SQL; the sort runs in the service over this pool. */
  findCandidates(filter: CandidateFilter): Promise<CandidateRow[]> {
    const me = filter.viewerId;
    const and: Prisma.UserWhereInput[] = [];
    if (filter.level.min !== undefined || filter.level.max !== undefined) {
      and.push({ level: { gte: filter.level.min, lte: filter.level.max } });
    }
    if (filter.region) {
      and.push({ homeRegion: filter.region, showHomeRegion: true });
    }
    if (filter.interests && filter.interests.length > 0) {
      and.push({ interests: { hasSome: filter.interests } });
    }
    if (filter.freeWeek) {
      and.push({
        availability: {
          some: {
            weekStart: filter.freeWeek,
            OR: [{ sat: true }, { sun: true }],
          },
        },
      });
    }
    return this.prisma.user.findMany({
      where: {
        id: { not: me },
        ...visibleUser,
        isDemo: false,
        publicProfile: true,
        findBuddies: true,
        lastActiveAt: { gte: filter.activeSince },
        buddyLinksSent: { none: { addresseeId: me } },
        buddyLinksGot: { none: { requesterId: me } },
        AND: and,
      },
      select: {
        ...userSelect,
        lastActiveAt: true,
        interests: true,
        homeRegion: true,
        showHomeRegion: true,
      },
      orderBy: [{ lastActiveAt: 'desc' }, { id: 'asc' }],
      take: filter.take,
    });
  }

  async availabilityFor(
    userIds: string[],
    weekStart: Date,
  ): Promise<Map<string, Availability>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.prisma.buddyAvailability.findMany({
      where: { userId: { in: userIds }, weekStart },
      select: { userId: true, sat: true, sun: true },
    });
    return new Map(rows.map((row) => [row.userId, row]));
  }

  async getAvailability(
    userId: string,
    weekStart: Date,
  ): Promise<Availability> {
    const row = await this.prisma.buddyAvailability.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
      select: { sat: true, sun: true },
    });
    return row ?? { sat: false, sun: false };
  }

  async putAvailability(
    userId: string,
    weekStart: Date,
    value: Availability,
  ): Promise<Availability> {
    return this.prisma.buddyAvailability.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      create: { userId, weekStart, ...value },
      update: value,
      select: { sat: true, sun: true },
    });
  }

  /** Per ratee: distinct raters, distinct trips and the mean of each trait. */
  async ratingAggregates(
    userIds: string[],
  ): Promise<Map<string, RatingAggregate>> {
    if (userIds.length === 0) return new Map();
    const where = { rateeId: { in: userIds } };
    const [means, raterPairs, tripPairs] = await Promise.all([
      this.prisma.tripRating.groupBy({
        by: ['rateeId'],
        where,
        _avg: { reliable: true, safety: true, company: true },
      }),
      this.prisma.tripRating.groupBy({ by: ['rateeId', 'raterId'], where }),
      this.prisma.tripRating.groupBy({
        by: ['rateeId', 'groupTripId'],
        where,
      }),
    ]);
    const count = (rows: { rateeId: string }[]) => {
      const counts = new Map<string, number>();
      for (const row of rows) {
        counts.set(row.rateeId, (counts.get(row.rateeId) ?? 0) + 1);
      }
      return counts;
    };
    const raters = count(raterPairs);
    const trips = count(tripPairs);
    return new Map(
      means.map((row) => [
        row.rateeId,
        {
          raters: raters.get(row.rateeId) ?? 0,
          trips: trips.get(row.rateeId) ?? 0,
          reliable: row._avg.reliable ?? 0,
          safety: row._avg.safety ?? 0,
          company: row._avg.company ?? 0,
        },
      ]),
    );
  }

  /** Group trips both the viewer and each user attended. */
  async tripsTogether(
    viewerId: string,
    userIds: string[],
  ): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();
    const mine = await this.prisma.groupTripMember.findMany({
      where: { userId: viewerId, attendedAt: { not: null } },
      select: { tripId: true },
    });
    if (mine.length === 0) return new Map();
    const rows = await this.prisma.groupTripMember.groupBy({
      by: ['userId'],
      where: {
        tripId: { in: mine.map((row) => row.tripId) },
        userId: { in: userIds },
        attendedAt: { not: null },
      },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.userId, row._count._all]));
  }

  /** AC6: upcoming open public trips with an accepted buddy approved on them. */
  async buddyTrips(
    userId: string,
    now: Date,
    take: number,
  ): Promise<BuddyTripRow[]> {
    const links = await this.prisma.buddyLink.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    });
    const buddyIds = links.map((link) =>
      link.requesterId === userId ? link.addresseeId : link.requesterId,
    );
    if (buddyIds.length === 0) return [];
    const buddyMember = {
      status: 'approved' as const,
      userId: { in: buddyIds },
      user: visibleUser,
    };
    return this.prisma.groupTrip.findMany({
      where: {
        visibility: 'public',
        status: 'open',
        startAt: { gte: now },
        members: { some: buddyMember },
      },
      select: {
        id: true,
        startAt: true,
        maxPeople: true,
        place: placeNames,
        _count: { select: { members: { where: { status: 'approved' } } } },
        members: {
          where: buddyMember,
          select: { user: { select: userSelect } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
      take,
    });
  }

  /** AC7: a group trip with its attendees (attendedAt set). */
  ratingTrip(tripId: string): Promise<RatingTripRow | null> {
    return this.prisma.groupTrip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        startAt: true,
        backBy: true,
        place: placeNames,
        members: {
          where: { attendedAt: { not: null } },
          select: { user: { select: userSelect } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /** AC7 Home card: trips the user attended whose rating window ends at or after `closedBefore`. */
  attendedTrips(userId: string, backBySince: Date): Promise<RatingTripRow[]> {
    return this.prisma.groupTrip.findMany({
      where: {
        backBy: { gte: backBySince },
        members: { some: { userId, attendedAt: { not: null } } },
      },
      select: {
        id: true,
        startAt: true,
        backBy: true,
        place: placeNames,
        members: {
          where: { attendedAt: { not: null } },
          select: { user: { select: userSelect } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ backBy: 'asc' }, { id: 'asc' }],
    });
  }

  /** The rater's own scores; the ratee never reads these. */
  myScores(
    raterId: string,
    tripIds: string[],
  ): Promise<(ScoreRow & { groupTripId: string })[]> {
    if (tripIds.length === 0) return Promise.resolve([]);
    return this.prisma.tripRating.findMany({
      where: { raterId, groupTripId: { in: tripIds } },
      select: {
        groupTripId: true,
        rateeId: true,
        reliable: true,
        safety: true,
        company: true,
      },
    });
  }

  async upsertRating(
    groupTripId: string,
    raterId: string,
    score: ScoreRow,
  ): Promise<void> {
    const { rateeId, reliable, safety, company } = score;
    await this.prisma.tripRating.upsert({
      where: {
        groupTripId_raterId_rateeId: { groupTripId, raterId, rateeId },
      },
      create: { groupTripId, raterId, rateeId, reliable, safety, company },
      update: { reliable, safety, company },
    });
  }

  private notification(
    notice: BuddyNotice,
    extra: Record<string, string>,
  ): Prisma.NotificationUncheckedCreateInput {
    return {
      userId: notice.userId,
      category: 'social',
      kind: notice.kind,
      title: notice.title,
      data: { ...notice.data, ...extra },
    };
  }
}

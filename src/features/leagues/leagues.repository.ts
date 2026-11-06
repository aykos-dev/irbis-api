import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type LeagueMedal,
  type LeagueOutcome,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { LeagueTierCode } from './leagues.constants.js';
import type { LeagueSeasonWindow } from './league-season.js';

export interface LeagueTripFact {
  id: string;
  userId: string;
  placeId: string;
  startedAt: Date | null;
  checkedOutAt: Date | null;
  climbM: number;
  xpTotal: number;
  isDemo: boolean;
  waypointCount: number;
  placeCheckInCount: number;
}

export interface LeagueMemberRow {
  id: string;
  userId: string;
  tier: LeagueTierCode;
  elevationM: number;
  qualifyingTrips: number;
  enrolledAt: Date;
  finalRank: number | null;
  outcome: LeagueOutcome | null;
  medal: LeagueMedal | null;
  resultSeenAt: Date | null;
  division: { id: string; number: number };
  season: {
    id: string;
    key: string;
    name: string;
    startsAt: Date;
    endsAt: Date;
    settlesAt: Date;
    status: string;
  };
  user: {
    username: string;
    displayName: string | null;
    avatarKey: string | null;
    publicProfile: boolean;
    level: number;
    blockedAt: Date | null;
    deletedAt: Date | null;
  };
}

export interface SeasonToFinalize {
  id: string;
  key: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  settlesAt: Date;
  divisions: Array<{
    id: string;
    tier: LeagueTierCode;
    members: Array<{
      id: string;
      userId: string;
      elevationM: number;
      qualifyingTrips: number;
      enrolledAt: Date;
    }>;
  }>;
}

export interface FinalMemberPlan {
  memberId: string;
  userId: string;
  fromTier: LeagueTierCode;
  nextTier: LeagueTierCode;
  rank: number;
  elevationM: number;
  outcome: LeagueOutcome;
  medal: LeagueMedal | null;
}

const memberSelect = {
  id: true,
  userId: true,
  tier: true,
  elevationM: true,
  qualifyingTrips: true,
  enrolledAt: true,
  finalRank: true,
  outcome: true,
  medal: true,
  resultSeenAt: true,
  division: { select: { id: true, number: true } },
  season: {
    select: {
      id: true,
      key: true,
      name: true,
      startsAt: true,
      endsAt: true,
      settlesAt: true,
      status: true,
    },
  },
  user: {
    select: {
      username: true,
      displayName: true,
      avatarKey: true,
      publicProfile: true,
      level: true,
      blockedAt: true,
      deletedAt: true,
    },
  },
} satisfies Prisma.LeagueMemberSelect;

@Injectable()
export class LeaguesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async configValue(): Promise<Prisma.JsonValue | null> {
    const row = await this.prisma.gameConfig.findUnique({
      where: { key: 'leagues.config' },
      select: { value: true },
    });
    return row?.value ?? null;
  }

  async ensureSeason(
    window: LeagueSeasonWindow,
    now: Date,
  ): Promise<{ id: string; status: 'active' | 'settling' }> {
    const status = now < window.endsAt ? 'active' : 'settling';
    const row = await this.prisma.leagueSeason.upsert({
      where: { key: window.key },
      create: { ...window, status },
      update: {
        name: window.name,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        settlesAt: window.settlesAt,
      },
      select: { id: true, status: true },
    });
    return {
      id: row.id,
      status: row.status === 'active' ? 'active' : 'settling',
    };
  }

  async tripFact(
    userId: string,
    tripId: string,
  ): Promise<LeagueTripFact | null> {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, userId },
      select: {
        id: true,
        userId: true,
        placeId: true,
        startedAt: true,
        checkedOutAt: true,
        climbM: true,
        user: { select: { xpTotal: true, isDemo: true } },
        _count: { select: { waypoints: true } },
      },
    });
    if (!trip) return null;
    const placeCheckInCount =
      trip.startedAt && trip.checkedOutAt
        ? await this.prisma.checkIn.count({
            where: {
              userId,
              placeId: trip.placeId,
              counted: true,
              recordedAt: { gte: trip.startedAt, lte: trip.checkedOutAt },
            },
          })
        : 0;
    return {
      id: trip.id,
      userId: trip.userId,
      placeId: trip.placeId,
      startedAt: trip.startedAt,
      checkedOutAt: trip.checkedOutAt,
      climbM: trip.climbM,
      xpTotal: trip.user.xpTotal,
      isDemo: trip.user.isDemo,
      waypointCount: trip._count.waypoints,
      placeCheckInCount,
    };
  }

  async addContribution(input: {
    tripId: string;
    userId: string;
    seasonId: string;
    tier: LeagueTierCode;
    elevationM: number;
    capacity: number;
    now: Date;
  }): Promise<{ awardedM: number; seasonalM: number }> {
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.leagueContribution.findUnique({
          where: { tripId: input.tripId },
          select: {
            elevationM: true,
            member: { select: { elevationM: true } },
          },
        });
        if (existing)
          return { awardedM: 0, seasonalM: existing.member.elevationM };

        let member = await tx.leagueMember.findUnique({
          where: {
            seasonId_userId: { seasonId: input.seasonId, userId: input.userId },
          },
          select: { id: true, elevationM: true },
        });
        if (!member) {
          const divisionId = await this.openDivision(
            tx,
            input.seasonId,
            input.tier,
            input.capacity,
          );
          member = await tx.leagueMember.create({
            data: {
              seasonId: input.seasonId,
              divisionId,
              userId: input.userId,
              tier: input.tier,
              enrolledAt: input.now,
            },
            select: { id: true, elevationM: true },
          });
        }
        const updated = await tx.leagueMember.update({
          where: { id: member.id },
          data: {
            elevationM: { increment: input.elevationM },
            qualifyingTrips: { increment: 1 },
          },
          select: { elevationM: true },
        });
        await tx.leagueContribution.create({
          data: {
            tripId: input.tripId,
            userId: input.userId,
            seasonId: input.seasonId,
            memberId: member.id,
            elevationM: input.elevationM,
          },
        });
        return { awardedM: input.elevationM, seasonalM: updated.elevationM };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  memberForSeason(
    userId: string,
    seasonId: string,
  ): Promise<LeagueMemberRow | null> {
    return this.prisma.leagueMember.findUnique({
      where: { seasonId_userId: { seasonId, userId } },
      select: memberSelect,
    });
  }

  divisionMembers(divisionId: string): Promise<LeagueMemberRow[]> {
    return this.prisma.leagueMember.findMany({
      where: { divisionId },
      orderBy: [{ elevationM: 'desc' }, { enrolledAt: 'asc' }, { id: 'asc' }],
      select: memberSelect,
    });
  }

  latestPendingResult(userId: string): Promise<LeagueMemberRow | null> {
    return this.prisma.leagueMember.findFirst({
      where: {
        userId,
        outcome: { not: null },
        resultSeenAt: null,
        season: { status: 'closed' },
      },
      orderBy: [{ season: { endsAt: 'desc' } }, { id: 'desc' }],
      select: memberSelect,
    });
  }

  async markLatestResultSeen(userId: string, seenAt: Date): Promise<boolean> {
    const row = await this.prisma.leagueMember.findFirst({
      where: {
        userId,
        outcome: { not: null },
        resultSeenAt: null,
        season: { status: 'closed' },
      },
      orderBy: [{ season: { endsAt: 'desc' } }, { id: 'desc' }],
      select: { id: true },
    });
    if (!row) return false;
    await this.prisma.leagueMember.updateMany({
      where: { id: row.id, resultSeenAt: null },
      data: { resultSeenAt: seenAt },
    });
    return true;
  }

  async publicMember(
    username: string,
  ): Promise<{ username: string; member: LeagueMemberRow | null } | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        username: username.toLowerCase(),
        publicProfile: true,
        deletedAt: null,
        blockedAt: null,
      },
      select: { id: true, username: true },
    });
    if (!user) return null;
    const member = await this.prisma.leagueMember.findFirst({
      where: { userId: user.id },
      orderBy: [{ season: { startsAt: 'desc' } }, { createdAt: 'desc' }],
      select: memberSelect,
    });
    return { username: user.username, member };
  }

  seasonsDue(now: Date): Promise<SeasonToFinalize[]> {
    return this.prisma.leagueSeason.findMany({
      where: { status: { not: 'closed' }, settlesAt: { lte: now } },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        key: true,
        name: true,
        startsAt: true,
        endsAt: true,
        settlesAt: true,
        divisions: {
          select: {
            id: true,
            tier: true,
            members: {
              select: {
                id: true,
                userId: true,
                elevationM: true,
                qualifyingTrips: true,
                enrolledAt: true,
              },
            },
          },
        },
      },
    });
  }

  async finalizeSeason(input: {
    seasonId: string;
    seasonName: string;
    plans: FinalMemberPlan[];
    next: LeagueSeasonWindow;
    capacity: number;
    now: Date;
  }): Promise<boolean> {
    return this.prisma.$transaction(
      async (tx) => {
        const closed = await tx.leagueSeason.updateMany({
          where: { id: input.seasonId, status: { not: 'closed' } },
          data: { status: 'closed', finalizedAt: input.now },
        });
        if (closed.count === 0) return false;
        const nextSeason = await tx.leagueSeason.upsert({
          where: { key: input.next.key },
          create: { ...input.next, status: 'active' },
          update: {},
          select: { id: true },
        });

        for (const plan of input.plans) {
          await tx.leagueMember.update({
            where: { id: plan.memberId },
            data: {
              finalRank: plan.rank,
              outcome: plan.outcome,
              medal: plan.medal,
            },
          });
          await tx.notification.create({
            data: {
              userId: plan.userId,
              category: 'rewards',
              kind: 'league_result',
              title: {
                en: `${input.seasonName} league result`,
                ru: `Результат лиги: ${input.seasonName}`,
                uz: `${input.seasonName} ligasi natijasi`,
              },
              body: {
                en: `Rank #${plan.rank} · ${plan.outcome}`,
                ru: `Место №${plan.rank} · ${plan.outcome}`,
                uz: `${plan.rank}-o‘rin · ${plan.outcome}`,
              },
              data: {
                season: input.seasonName,
                rank: plan.rank,
                outcome: plan.outcome,
              },
            },
          });
          const exists = await tx.leagueMember.findUnique({
            where: {
              seasonId_userId: { seasonId: nextSeason.id, userId: plan.userId },
            },
            select: { id: true },
          });
          if (!exists) {
            const divisionId = await this.openDivision(
              tx,
              nextSeason.id,
              plan.nextTier,
              input.capacity,
            );
            await tx.leagueMember.create({
              data: {
                seasonId: nextSeason.id,
                divisionId,
                userId: plan.userId,
                tier: plan.nextTier,
                enrolledAt: input.now,
              },
            });
          }
        }
        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async openDivision(
    tx: Prisma.TransactionClient,
    seasonId: string,
    tier: LeagueTierCode,
    capacity: number,
  ): Promise<string> {
    const divisions = await tx.leagueDivision.findMany({
      where: { seasonId, tier },
      orderBy: { number: 'asc' },
      select: { id: true, number: true, _count: { select: { members: true } } },
    });
    const open = divisions.find((row) => row._count.members < capacity);
    if (open) return open.id;
    const created = await tx.leagueDivision.create({
      data: { seasonId, tier, number: (divisions.at(-1)?.number ?? 0) + 1 },
      select: { id: true },
    });
    return created.id;
  }
}

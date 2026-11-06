import { Injectable } from '@nestjs/common';
import { StorageUnavailableError } from '../../lib/storage/storage.errors.js';
import { StorageService } from '../../lib/storage/storage.service.js';
import type {
  CurrentLeagueDto,
  LeagueResultDto,
  LeagueStandingDto,
  PublicLeagueDto,
} from './dto/leagues.response.dto.js';
import {
  FALLBACK_LEAGUE_CONFIG,
  leagueConfigSchema,
  type LeagueConfig,
} from './leagues.config.js';
import { LEAGUE_TIERS, type LeagueTierCode } from './leagues.constants.js';
import { LeagueProfileNotFoundError } from './leagues.errors.js';
import { leagueSeasonAt, nextLeagueSeason } from './league-season.js';
import {
  LeaguesRepository,
  type LeagueMemberRow,
  type FinalMemberPlan,
} from './leagues.repository.js';
import { movementFor, placementTier, rankDivision } from './leagues.rules.js';

@Injectable()
export class LeaguesService {
  constructor(
    private readonly repository: LeaguesRepository,
    private readonly storage: StorageService,
  ) {}

  async recordCheckout(
    userId: string,
    tripId: string,
    now = new Date(),
  ): Promise<{ awardedM: number; seasonalM: number }> {
    const config = await this.config();
    const trip = await this.repository.tripFact(userId, tripId);
    if (!trip || !trip.startedAt || !trip.checkedOutAt || trip.isDemo)
      return { awardedM: 0, seasonalM: 0 };
    if (trip.waypointCount === 0 && trip.placeCheckInCount === 0)
      return { awardedM: 0, seasonalM: 0 };
    const season = leagueSeasonAt(trip.startedAt, config);
    if (trip.startedAt < new Date(config.startAt) || now > season.settlesAt)
      return { awardedM: 0, seasonalM: 0 };
    const stored = await this.repository.ensureSeason(season, now);
    return this.repository.addContribution({
      tripId,
      userId,
      seasonId: stored.id,
      tier: placementTier(trip.xpTotal, config.xpThresholds),
      elevationM: Math.max(0, trip.climbM),
      capacity: config.divisionCapacity,
      now,
    });
  }

  async current(userId: string, now = new Date()): Promise<CurrentLeagueDto> {
    const config = await this.config();
    await this.finalizeDue(now, config);
    const window = leagueSeasonAt(now, config);
    const season = await this.repository.ensureSeason(window, now);
    const [member, pending] = await Promise.all([
      this.repository.memberForSeason(userId, season.id),
      this.repository.latestPendingResult(userId),
    ]);
    const seasonDto = {
      key: window.key,
      name: window.name,
      startsAt: window.startsAt.toISOString(),
      endsAt: window.endsAt.toISOString(),
      settlesAt: window.settlesAt.toISOString(),
      status: now < window.endsAt ? ('active' as const) : ('settling' as const),
    };
    if (!member) {
      return {
        season: seasonDto,
        ranked: false,
        tier: null,
        division: null,
        rank: null,
        elevationM: 0,
        standings: [],
        movement: null,
        pendingResult: this.resultDto(pending),
      };
    }
    const rows = await this.repository.divisionMembers(member.division.id);
    const ranked = rankDivision(rows, member.tier, config);
    const rankById = new Map(ranked.map((row) => [row.id, row.rank]));
    const movement = movementFor(rows.length, config);
    return {
      season: seasonDto,
      ranked: true,
      tier: member.tier,
      division: member.division.number,
      rank: rankById.get(member.id) ?? null,
      elevationM: member.elevationM,
      standings: rows
        .filter(
          (row) => row.user.deletedAt === null && row.user.blockedAt === null,
        )
        .map((row, index) =>
          this.standing(row, rankById.get(row.id) ?? index + 1, userId, index),
        ),
      movement: { ...movement, champion: member.tier === 'legend' },
      pendingResult: this.resultDto(pending),
    };
  }

  async publicSummary(username: string): Promise<PublicLeagueDto> {
    const found = await this.repository.publicMember(username);
    if (!found) throw new LeagueProfileNotFoundError();
    const member = found.member;
    if (!member) {
      return {
        username: found.username,
        ranked: false,
        tier: null,
        rank: null,
        medal: null,
        elevationM: 0,
        seasonName: null,
      };
    }
    let rank = member.finalRank;
    if (rank === null) {
      const [config, division] = await Promise.all([
        this.config(),
        this.repository.divisionMembers(member.division.id),
      ]);
      rank =
        rankDivision(division, member.tier, config).find(
          (row) => row.id === member.id,
        )?.rank ?? null;
    }
    return {
      username: found.username,
      ranked: true,
      tier: member.tier,
      rank,
      medal: member.medal,
      elevationM: member.elevationM,
      seasonName: member.season.name,
    };
  }

  async markResultSeen(
    userId: string,
    now = new Date(),
  ): Promise<{ seen: boolean }> {
    return { seen: await this.repository.markLatestResultSeen(userId, now) };
  }

  async finalizeDue(now = new Date(), loaded?: LeagueConfig): Promise<number> {
    const config = loaded ?? (await this.config());
    const seasons = await this.repository.seasonsDue(now);
    let finalized = 0;
    for (const season of seasons) {
      const plans: FinalMemberPlan[] = season.divisions.flatMap((division) =>
        rankDivision(division.members, division.tier, config).map((row) => ({
          memberId: row.id,
          userId: row.userId,
          fromTier: division.tier,
          nextTier: row.nextTier,
          rank: row.rank,
          elevationM: row.elevationM,
          outcome: row.outcome,
          medal: row.medal,
        })),
      );
      const window = leagueSeasonAt(season.startsAt, config);
      if (
        await this.repository.finalizeSeason({
          seasonId: season.id,
          seasonName: season.name,
          plans,
          next: nextLeagueSeason(window, config),
          capacity: config.divisionCapacity,
          now,
        })
      )
        finalized += 1;
    }
    return finalized;
  }

  private async config(): Promise<LeagueConfig> {
    const value = await this.repository.configValue();
    const parsed = leagueConfigSchema.safeParse(
      value ?? FALLBACK_LEAGUE_CONFIG,
    );
    return parsed.success ? parsed.data : FALLBACK_LEAGUE_CONFIG;
  }

  private standing(
    row: LeagueMemberRow,
    rank: number,
    viewerId: string,
    index: number,
  ): LeagueStandingDto {
    const isPrivate = !row.user.publicProfile;
    return {
      memberId: row.id,
      rank,
      elevationM: row.elevationM,
      isMe: row.userId === viewerId,
      isPrivate,
      username: isPrivate ? null : row.user.username,
      displayName: isPrivate
        ? `Explorer ${index + 1}`
        : (row.user.displayName ?? row.user.username),
      avatarUrl: isPrivate ? null : this.avatarUrl(row.user.avatarKey),
      level: row.user.level,
    };
  }

  private resultDto(member: LeagueMemberRow | null): LeagueResultDto | null {
    if (!member?.outcome || !member.finalRank) return null;
    const index = LEAGUE_TIERS.indexOf(member.tier);
    const toTier: LeagueTierCode =
      member.outcome === 'promoted'
        ? LEAGUE_TIERS[Math.min(index + 1, LEAGUE_TIERS.length - 1)]
        : member.outcome === 'demoted'
          ? LEAGUE_TIERS[Math.max(index - 1, 0)]
          : member.tier;
    return {
      fromTier: member.tier,
      toTier,
      outcome: member.outcome,
      medal: member.medal,
      rank: member.finalRank,
      elevationM: member.elevationM,
      seasonName: member.season.name,
    };
  }

  private avatarUrl(key: string | null): string | null {
    if (!key) return null;
    try {
      return this.storage.publicUrl(key);
    } catch (error) {
      if (error instanceof StorageUnavailableError) return null;
      throw error;
    }
  }
}

import { ApiProperty } from '@nestjs/swagger';
import {
  LEAGUE_MEDALS,
  LEAGUE_OUTCOMES,
  LEAGUE_TIERS,
  type LeagueMedalCode,
  type LeagueOutcomeCode,
  type LeagueTierCode,
} from '../leagues.constants.js';

export class LeagueSeasonDto {
  @ApiProperty({ example: '2026-autumn' }) key: string;
  @ApiProperty({ example: 'Autumn 2026' }) name: string;
  @ApiProperty({ format: 'date-time' }) startsAt: string;
  @ApiProperty({ format: 'date-time' }) endsAt: string;
  @ApiProperty({ format: 'date-time' }) settlesAt: string;
  @ApiProperty({
    enum: ['active', 'settling'],
    enumName: 'CurrentLeagueSeasonStatus',
  })
  status: 'active' | 'settling';
}

export class LeagueStandingDto {
  @ApiProperty({ format: 'uuid' }) memberId: string;
  @ApiProperty({ type: 'integer', minimum: 1 }) rank: number;
  @ApiProperty({ type: 'integer', minimum: 0 }) elevationM: number;
  @ApiProperty() isMe: boolean;
  @ApiProperty() isPrivate: boolean;
  @ApiProperty({ type: String, nullable: true }) username: string | null;
  @ApiProperty() displayName: string;
  @ApiProperty({ type: String, nullable: true }) avatarUrl: string | null;
  @ApiProperty({ type: 'integer', minimum: 1, maximum: 7 }) level: number;
}

export class LeagueMovementDto {
  @ApiProperty({ type: 'integer', minimum: 0 }) promote: number;
  @ApiProperty({ type: 'integer', minimum: 0 }) demote: number;
  @ApiProperty() champion: boolean;
}

export class LeagueResultDto {
  @ApiProperty({ enum: LEAGUE_TIERS, enumName: 'LeagueTier' })
  fromTier: LeagueTierCode;
  @ApiProperty({ enum: LEAGUE_TIERS, enumName: 'LeagueTier' })
  toTier: LeagueTierCode;
  @ApiProperty({ enum: LEAGUE_OUTCOMES, enumName: 'LeagueOutcome' })
  outcome: LeagueOutcomeCode;
  @ApiProperty({ enum: LEAGUE_MEDALS, enumName: 'LeagueMedal', nullable: true })
  medal: LeagueMedalCode | null;
  @ApiProperty({ type: 'integer', minimum: 1 }) rank: number;
  @ApiProperty({ type: 'integer', minimum: 0 }) elevationM: number;
  @ApiProperty() seasonName: string;
}

export class CurrentLeagueDto {
  @ApiProperty({ type: LeagueSeasonDto }) season: LeagueSeasonDto;
  @ApiProperty() ranked: boolean;
  @ApiProperty({ enum: LEAGUE_TIERS, enumName: 'LeagueTier', nullable: true })
  tier: LeagueTierCode | null;
  @ApiProperty({ type: 'integer', nullable: true }) division: number | null;
  @ApiProperty({ type: 'integer', nullable: true }) rank: number | null;
  @ApiProperty({ type: 'integer', minimum: 0 }) elevationM: number;
  @ApiProperty({ type: [LeagueStandingDto] }) standings: LeagueStandingDto[];
  @ApiProperty({ type: LeagueMovementDto, nullable: true })
  movement: LeagueMovementDto | null;
  @ApiProperty({ type: LeagueResultDto, nullable: true })
  pendingResult: LeagueResultDto | null;
}

export class PublicLeagueDto {
  @ApiProperty() username: string;
  @ApiProperty() ranked: boolean;
  @ApiProperty({ enum: LEAGUE_TIERS, enumName: 'LeagueTier', nullable: true })
  tier: LeagueTierCode | null;
  @ApiProperty({ type: 'integer', nullable: true }) rank: number | null;
  @ApiProperty({ enum: LEAGUE_MEDALS, enumName: 'LeagueMedal', nullable: true })
  medal: LeagueMedalCode | null;
  @ApiProperty({ type: 'integer', minimum: 0 }) elevationM: number;
  @ApiProperty({ type: String, nullable: true }) seasonName: string | null;
}

export class LeagueResultSeenDto {
  @ApiProperty() seen: boolean;
}

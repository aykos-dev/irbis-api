import { ApiProperty } from '@nestjs/swagger';
import {
  BADGE_GROUPS,
  BADGE_RARITIES,
  type BadgeGroupCode,
  type BadgeRarityCode,
} from '../badges.constants.js';

/** Copy for one badge in the three supported locales. */
export class BadgeTextDto {
  @ApiProperty({ example: 'Peak Bagger I' })
  uz: string;

  @ApiProperty({ example: 'Peak Bagger I' })
  ru: string;

  @ApiProperty({ example: 'Peak Bagger I' })
  en: string;
}

export class BadgeDto {
  @ApiProperty({ example: 'peak-bagger-1' })
  key: string;

  @ApiProperty({ enum: BADGE_GROUPS, enumName: 'BadgeGroup' })
  group: BadgeGroupCode;

  @ApiProperty({ enum: BADGE_RARITIES, enumName: 'BadgeRarity' })
  rarity: BadgeRarityCode;

  @ApiProperty({ type: BadgeTextDto })
  title: BadgeTextDto;

  @ApiProperty({ type: BadgeTextDto })
  description: BadgeTextDto;

  @ApiProperty({ type: 'integer', minimum: 1, example: 3 })
  target: number;

  @ApiProperty({
    type: 'integer',
    minimum: 0,
    description: 'Capped at the target; 0 for guests.',
  })
  progress: number;

  @ApiProperty({
    format: 'date-time',
    nullable: true,
    description: 'Null until the badge is earned.',
  })
  earnedAt: string | null;

  @ApiProperty({ description: 'The owner picked it for the profile showcase.' })
  showcase: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Art file stem; null draws a code hexagon.',
  })
  art: string | null;
}

export class BadgeGroupDto {
  @ApiProperty({ enum: BADGE_GROUPS, enumName: 'BadgeGroup' })
  key: BadgeGroupCode;

  @ApiProperty({ type: BadgeTextDto })
  title: BadgeTextDto;

  @ApiProperty({ type: 'integer', minimum: 0 })
  earned: number;

  @ApiProperty({ type: 'integer', minimum: 1 })
  total: number;
}

export class BadgesListDto {
  @ApiProperty({ type: [BadgeDto] })
  items: BadgeDto[];

  @ApiProperty({ type: [BadgeGroupDto] })
  groups: BadgeGroupDto[];

  @ApiProperty({ type: 'integer', minimum: 0 })
  collected: number;

  @ApiProperty({ type: 'integer', minimum: 1 })
  total: number;

  @ApiProperty({
    type: [String],
    description: 'Up to four badge keys shown on the profile.',
  })
  showcase: string[];
}

export class PublicBadgeDto {
  @ApiProperty({ example: 'peak-bagger-1' })
  key: string;

  @ApiProperty({ type: BadgeTextDto })
  title: BadgeTextDto;

  @ApiProperty({ enum: BADGE_RARITIES, enumName: 'BadgeRarity' })
  rarity: BadgeRarityCode;

  @ApiProperty({ type: String, nullable: true })
  art: string | null;

  @ApiProperty({ format: 'date-time' })
  earnedAt: string;
}

export class PublicBadgesDto {
  @ApiProperty({ example: 'guest_1' })
  username: string;

  @ApiProperty({ type: [PublicBadgeDto] })
  items: PublicBadgeDto[];
}

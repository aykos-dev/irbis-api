import { ApiProperty } from '@nestjs/swagger';
import {
  HOME_REGIONS,
  type HomeRegionCode,
} from '../../../common/profile.constants.js';
import { INTERESTS, type InterestCode } from '../../auth/auth.constants.js';
import {
  BUDDY_LINK_STATUSES,
  type BuddyLinkStatusCode,
} from '../buddies.constants.js';

/** A place name in every locale (ru/en fall back to uz). */
export class BuddyPlaceNamesDto {
  @ApiProperty() uz: string;
  @ApiProperty({ description: 'Falls back to uz.' }) ru: string;
  @ApiProperty({ description: 'Falls back to uz.' }) en: string;
}

export class BuddyUserDto {
  @ApiProperty({ format: 'uuid' }) userId: string;
  @ApiProperty() username: string;
  @ApiProperty({ type: String, nullable: true }) displayName: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Null when no avatar is set or storage is unavailable.',
  })
  avatarUrl: string | null;
  @ApiProperty({ type: 'integer', minimum: 1, maximum: 7 }) level: number;
}

/** A buddy link seen from the caller: `userId` is always the other person. */
export class BuddyLinkDto extends BuddyUserDto {
  @ApiProperty({ format: 'uuid', description: 'The link (request) id.' })
  id: string;
  @ApiProperty({ enum: BUDDY_LINK_STATUSES, enumName: 'BuddyLinkStatus' })
  status: BuddyLinkStatusCode;
}

export class BuddiesListDto {
  @ApiProperty({ type: [BuddyLinkDto] }) buddies: BuddyLinkDto[];
  @ApiProperty({ type: [BuddyLinkDto], description: 'Pending, sent to me.' })
  incoming: BuddyLinkDto[];
  @ApiProperty({ type: [BuddyLinkDto], description: 'Pending, sent by me.' })
  outgoing: BuddyLinkDto[];
}

export class BuddyRatingDto {
  @ApiProperty({ description: 'Mean of all traits, 1 decimal.', example: 4.6 })
  mean: number;
  @ApiProperty({ type: 'integer', description: 'Distinct raters.' })
  raters: number;
}

export class BuddyFreeDto {
  @ApiProperty() sat: boolean;
  @ApiProperty() sun: boolean;
}

export class BuddyCandidateDto extends BuddyUserDto {
  @ApiProperty({ description: 'Level 5 or above.' }) verifiedLeader: boolean;
  @ApiProperty({
    enum: HOME_REGIONS,
    enumName: 'HomeRegion',
    nullable: true,
    description: 'Null unless the person shows their home region.',
  })
  region: HomeRegionCode | null;
  @ApiProperty({
    enum: INTERESTS,
    enumName: 'Interest',
    isArray: true,
    maxItems: 3,
  })
  interests: InterestCode[];
  @ApiProperty({
    type: BuddyRatingDto,
    nullable: true,
    description: 'Null below 3 distinct raters.',
  })
  rating: BuddyRatingDto | null;
  @ApiProperty({
    type: 'integer',
    description: 'Group trips you both attended.',
  })
  tripsTogether: number;
  @ApiProperty({ type: BuddyFreeDto, description: 'This Asia/Tashkent week.' })
  free: BuddyFreeDto;
}

export class BuddyCandidatePageDto {
  @ApiProperty({ type: [BuddyCandidateDto] }) items: BuddyCandidateDto[];
  @ApiProperty({ type: String, nullable: true }) nextCursor: string | null;
  @ApiProperty({ type: 'integer', description: 'All matches for the filters.' })
  matchCount: number;
}

export class AvailabilityDto {
  @ApiProperty({
    format: 'date',
    example: '2026-11-02',
    description: 'Monday of the current Asia/Tashkent week.',
  })
  weekStart: string;
  @ApiProperty() sat: boolean;
  @ApiProperty() sun: boolean;
}

export class BuddyTripBuddyDto {
  @ApiProperty({ format: 'uuid' }) userId: string;
  @ApiProperty({ type: String, nullable: true }) displayName: string | null;
  @ApiProperty() username: string;
}

export class BuddyTripDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: BuddyPlaceNamesDto })
  placeName: BuddyPlaceNamesDto;
  @ApiProperty({ format: 'date-time' }) startAt: string;
  @ApiProperty({ type: 'integer' }) approvedCount: number;
  @ApiProperty({ type: 'integer', nullable: true }) maxPeople: number | null;
  @ApiProperty({ type: [BuddyTripBuddyDto] }) buddies: BuddyTripBuddyDto[];
}

export class BuddyTripsDto {
  @ApiProperty({ type: [BuddyTripDto], maxItems: 10 }) items: BuddyTripDto[];
}

export class TripRatingScoresDto {
  @ApiProperty({ type: 'integer', minimum: 1, maximum: 5 }) reliable: number;
  @ApiProperty({ type: 'integer', minimum: 1, maximum: 5 }) safety: number;
  @ApiProperty({ type: 'integer', minimum: 1, maximum: 5 }) company: number;
}

export class RatingAttendeeDto extends BuddyUserDto {
  @ApiProperty({
    type: TripRatingScoresDto,
    nullable: true,
    description: 'Your scores for this person, or null when not rated yet.',
  })
  myScores: TripRatingScoresDto | null;
}

export class TripRatingsPendingDto {
  @ApiProperty({ format: 'uuid' }) groupTripId: string;
  @ApiProperty({ format: 'date-time', description: 'backBy + 7 days.' })
  closesAt: string;
  @ApiProperty({ type: [RatingAttendeeDto] }) attendees: RatingAttendeeDto[];
}

export class MyPendingRatingDto {
  @ApiProperty({ format: 'uuid' }) groupTripId: string;
  @ApiProperty({ type: BuddyPlaceNamesDto })
  placeName: BuddyPlaceNamesDto;
  @ApiProperty({ format: 'date-time' }) startAt: string;
  @ApiProperty({ format: 'date-time' }) closesAt: string;
  @ApiProperty({ type: 'integer', description: 'Attendees not rated yet.' })
  unrated: number;
}

export class MyPendingRatingsDto {
  @ApiProperty({ type: [MyPendingRatingDto] }) items: MyPendingRatingDto[];
}

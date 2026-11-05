import { ApiProperty } from '@nestjs/swagger';
import {
  PLACE_TYPES,
  type PlaceTypeCode,
} from '../../places/places.constants.js';
import { GEAR_KEYS } from '../../trip-plan/trip-plan.constants.js';
import {
  GROUP_TRIP_MEMBER_STATUSES,
  GROUP_TRIP_ROLES,
  GROUP_TRIP_STATUSES,
  GROUP_TRIP_VISIBILITIES,
  type GroupTripMemberStatusCode,
  type GroupTripRoleCode,
  type GroupTripStatusCode,
  type GroupTripVisibilityCode,
} from '../trip-events.constants.js';

export class GroupTripPlaceNamesDto {
  @ApiProperty() uz: string;
  @ApiProperty({ description: 'Falls back to uz.' }) ru: string;
  @ApiProperty({ description: 'Falls back to uz.' }) en: string;
}

export class GroupTripPlaceDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() slug: string;
  @ApiProperty({ type: GroupTripPlaceNamesDto }) names: GroupTripPlaceNamesDto;
  @ApiProperty({ enum: PLACE_TYPES, enumName: 'PlaceType' })
  type: PlaceTypeCode;
  @ApiProperty({ type: 'integer' }) difficulty: number;
  @ApiProperty({ type: 'integer' }) requiredLevel: number;
}

export class GroupTripMeetingDto {
  @ApiProperty() text: string;
  @ApiProperty({ type: Number, nullable: true }) lat: number | null;
  @ApiProperty({ type: Number, nullable: true }) lng: number | null;
}

export class GroupTripCarpoolDto {
  @ApiProperty({ example: '06:30' }) from: string;
  @ApiProperty({ type: 'integer' }) seats: number;
}

export class GroupTripGearDto {
  @ApiProperty({ enum: GEAR_KEYS, enumName: 'GearKey', isArray: true })
  keys: string[];
  @ApiProperty({ type: [String] }) custom: string[];
}

export class GroupTripLeaderDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() username: string;
  @ApiProperty({ type: String, nullable: true }) displayName: string | null;
  @ApiProperty({ type: 'integer' }) level: number;
  @ApiProperty({ description: 'Level 5 or higher.' }) verifiedLeader: boolean;
}

export class GroupTripGroupDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
}

export class GroupTripMeDto {
  @ApiProperty({ enum: GROUP_TRIP_ROLES, enumName: 'GroupTripRole' })
  role: GroupTripRoleCode;
  @ApiProperty({
    enum: GROUP_TRIP_MEMBER_STATUSES,
    enumName: 'GroupTripMemberStatus',
  })
  status: GroupTripMemberStatusCode;
}

export class GroupTripParticipantDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() username: string;
  @ApiProperty({ type: String, nullable: true }) displayName: string | null;
  @ApiProperty({ type: 'integer' }) level: number;
}

export class GroupTripRequestDto {
  @ApiProperty({ format: 'uuid' }) userId: string;
  @ApiProperty() username: string;
  @ApiProperty({ type: 'integer' }) level: number;
  @ApiProperty({ type: String, nullable: true }) note: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class GroupTripDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: GroupTripPlaceDto }) place: GroupTripPlaceDto;
  @ApiProperty({
    enum: GROUP_TRIP_VISIBILITIES,
    enumName: 'GroupTripVisibility',
  })
  visibility: GroupTripVisibilityCode;
  @ApiProperty({ enum: GROUP_TRIP_STATUSES, enumName: 'GroupTripStatus' })
  status: GroupTripStatusCode;
  @ApiProperty({ format: 'date-time' }) startAt: string;
  @ApiProperty({ format: 'date-time' }) backBy: string;
  @ApiProperty({ type: GroupTripMeetingDto }) meeting: GroupTripMeetingDto;
  @ApiProperty({ type: GroupTripCarpoolDto, nullable: true })
  carpool: GroupTripCarpoolDto | null;
  @ApiProperty({ type: 'integer', nullable: true }) maxPeople: number | null;
  @ApiProperty({ type: 'integer', nullable: true }) minLevel: number | null;
  @ApiProperty({ type: GroupTripGearDto }) gear: GroupTripGearDto;
  @ApiProperty() description: string;
  @ApiProperty({ type: GroupTripLeaderDto }) leader: GroupTripLeaderDto;
  @ApiProperty({ type: [GroupTripGroupDto] }) groups: GroupTripGroupDto[];
  @ApiProperty({
    type: 'integer',
    description: 'Approved people, leader included.',
  })
  approvedCount: number;
  @ApiProperty({
    type: 'integer',
    nullable: true,
    description: 'Null when there is no cap.',
  })
  spotsLeft: number | null;
  @ApiProperty({ type: GroupTripMeDto, nullable: true })
  me: GroupTripMeDto | null;
  @ApiProperty({
    type: [GroupTripParticipantDto],
    description: 'Approved people.',
  })
  participants: GroupTripParticipantDto[];
  @ApiProperty({
    type: [GroupTripRequestDto],
    description: 'Pending requests; leader only, else empty.',
  })
  requests: GroupTripRequestDto[];
}

export class GroupTripsPageDto {
  @ApiProperty({ type: [GroupTripDto] }) items: GroupTripDto[];
  @ApiProperty({ type: String, nullable: true }) nextCursor: string | null;
}

/** AC8 search hit. */
export class SearchGroupTripDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ description: 'English name, else Russian, else Uzbek.' })
  placeName: string;
  @ApiProperty({ format: 'date-time' }) startAt: string;
  @ApiProperty({ type: 'integer' }) approvedCount: number;
  @ApiProperty({ type: 'integer', nullable: true }) maxPeople: number | null;
}

export class AdminGroupTripDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() placeName: string;
  @ApiProperty() leaderUsername: string;
  @ApiProperty({ format: 'date-time' }) startAt: string;
  @ApiProperty({ enum: GROUP_TRIP_STATUSES, enumName: 'GroupTripStatus' })
  status: GroupTripStatusCode;
  @ApiProperty({ type: 'integer' }) approvedCount: number;
  @ApiProperty({ type: 'integer', nullable: true }) maxPeople: number | null;
}

export class AdminGroupTripsPageDto {
  @ApiProperty({ type: [AdminGroupTripDto] }) items: AdminGroupTripDto[];
  @ApiProperty({ type: String, nullable: true }) nextCursor: string | null;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  GEAR_KEYS,
  NAME_MAX,
  RELATION_MAX,
} from '../../trip-plan/trip-plan.constants.js';
import {
  CARPOOL_SEATS_MAX,
  CARPOOL_SEATS_MIN,
  CUSTOM_GEAR_ITEM_MAX,
  CUSTOM_GEAR_MAX_ITEMS,
  DESCRIPTION_MAX,
  GROUP_LINKS_MAX,
  ADMIN_NOTE_MAX,
  GROUP_TRIP_SCOPES,
  GROUP_TRIP_STATUSES,
  GROUP_TRIP_VISIBILITIES,
  MAX_PEOPLE_MAX,
  MAX_PEOPLE_MIN,
  MEETING_TEXT_MAX,
  MIN_LEVEL_MAX,
  MIN_LEVEL_MIN,
  NOTE_MAX,
  type GroupTripScope,
  type GroupTripStatusCode,
} from '../trip-events.constants.js';

/** Shape checks only (400); the field rules answer 422 GROUP_TRIP_INVALID. Caps stop oversized bodies. */
const TEXT_CAP = 1000;
const LIST_CAP = 50;

const UZ_PHONE = /^\+998\d{9}$/;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateGroupTripDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  placeId: string;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    maxItems: GROUP_LINKS_MAX,
    description: 'Groups where you are an active owner or admin.',
  })
  @IsArray()
  @ArrayMaxSize(GROUP_LINKS_MAX)
  @IsUUID('all', { each: true })
  groupIds: string[];

  @ApiProperty({
    enum: GROUP_TRIP_VISIBILITIES,
    enumName: 'GroupTripVisibility',
  })
  @IsString()
  visibility: string;

  @ApiProperty({
    format: 'date-time',
    description: 'Future, at most 60 Asia/Tashkent days ahead.',
  })
  @IsISO8601({ strict: true })
  startAt: string;

  @ApiProperty({
    format: 'date-time',
    description: 'After startAt, within trip maxDurationH.',
  })
  @IsISO8601({ strict: true })
  backBy: string;

  @ApiProperty({ minLength: 1, maxLength: MEETING_TEXT_MAX })
  @IsString()
  @MaxLength(TEXT_CAP)
  meetingText: string;

  @ApiPropertyOptional({
    minimum: -90,
    maximum: 90,
    description: 'With meetingLng.',
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  meetingLat?: number;

  @ApiPropertyOptional({
    minimum: -180,
    maximum: 180,
    description: 'With meetingLat.',
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  meetingLng?: number;

  @ApiPropertyOptional({
    example: '06:30',
    description: 'HH:MM, with carpoolSeats.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_CAP)
  carpoolFrom?: string;

  @ApiPropertyOptional({
    minimum: CARPOOL_SEATS_MIN,
    maximum: CARPOOL_SEATS_MAX,
  })
  @IsOptional()
  @IsInt()
  carpoolSeats?: number;

  @ApiPropertyOptional({
    minimum: MAX_PEOPLE_MIN,
    maximum: MAX_PEOPLE_MAX,
    description: 'Includes the leader.',
  })
  @IsOptional()
  @IsInt()
  maxPeople?: number;

  @ApiPropertyOptional({ minimum: MIN_LEVEL_MIN, maximum: MIN_LEVEL_MAX })
  @IsOptional()
  @IsInt()
  minLevel?: number;

  @ApiPropertyOptional({ enum: GEAR_KEYS, enumName: 'GearKey', isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(LIST_CAP)
  @IsString({ each: true })
  gearKeys?: string[];

  @ApiPropertyOptional({
    type: [String],
    maxItems: CUSTOM_GEAR_MAX_ITEMS,
    description: `Each 1–${CUSTOM_GEAR_ITEM_MAX} characters; duplicates are dropped.`,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(LIST_CAP)
  @IsString({ each: true })
  @MaxLength(TEXT_CAP, { each: true })
  customGear?: string[];

  @ApiPropertyOptional({ maxLength: DESCRIPTION_MAX })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_CAP)
  description?: string;
}

export class GroupTripsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  placeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({
    enum: GROUP_TRIP_SCOPES,
    enumName: 'GroupTripScope',
    default: 'upcoming',
  })
  @IsOptional()
  @IsIn(GROUP_TRIP_SCOPES)
  scope?: GroupTripScope;

  @ApiPropertyOptional({ description: 'nextCursor from the previous page.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string;
}

/** Same fields and rules as PUT /v1/me/emergency-contact. */
export class GroupTripContactDto {
  @ApiProperty({ maxLength: NAME_MAX })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX)
  name: string;

  @ApiProperty({ maxLength: RELATION_MAX, example: 'sister' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(RELATION_MAX)
  relation: string;

  @ApiProperty({ pattern: UZ_PHONE.source, example: '+998XXXXXXXXX' })
  @IsString()
  @Matches(UZ_PHONE)
  phone: string;
}

export class JoinGroupTripDto {
  @ApiPropertyOptional({ maxLength: NOTE_MAX })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(NOTE_MAX)
  note?: string;

  @ApiPropertyOptional({
    type: GroupTripContactDto,
    description: 'Saved as your emergency contact when you have none yet.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GroupTripContactDto)
  contact?: GroupTripContactDto;
}

/**
 * AC5: any subset of the create fields; the merged trip is checked with the create rules.
 * `null` clears an optional field (meeting point, carpool, maxPeople, minLevel).
 */
export class UpdateGroupTripDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  placeId?: string;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    maxItems: GROUP_LINKS_MAX,
    description: 'Replaces the links; groups you own or administer.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(GROUP_LINKS_MAX)
  @IsUUID('all', { each: true })
  groupIds?: string[];

  @ApiPropertyOptional({
    enum: GROUP_TRIP_VISIBILITIES,
    enumName: 'GroupTripVisibility',
  })
  @IsOptional()
  @IsString()
  visibility?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: true })
  startAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: true })
  backBy?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: MEETING_TEXT_MAX })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_CAP)
  meetingText?: string;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  meetingLat?: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  meetingLng?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '06:30' })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_CAP)
  carpoolFrom?: string | null;

  @ApiPropertyOptional({
    type: 'integer',
    nullable: true,
    minimum: CARPOOL_SEATS_MIN,
    maximum: CARPOOL_SEATS_MAX,
  })
  @IsOptional()
  @IsInt()
  carpoolSeats?: number | null;

  @ApiPropertyOptional({
    type: 'integer',
    nullable: true,
    minimum: MAX_PEOPLE_MIN,
    maximum: MAX_PEOPLE_MAX,
    description: 'Not below the approved count.',
  })
  @IsOptional()
  @IsInt()
  maxPeople?: number | null;

  @ApiPropertyOptional({
    type: 'integer',
    nullable: true,
    minimum: MIN_LEVEL_MIN,
    maximum: MIN_LEVEL_MAX,
  })
  @IsOptional()
  @IsInt()
  minLevel?: number | null;

  @ApiPropertyOptional({ enum: GEAR_KEYS, enumName: 'GearKey', isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(LIST_CAP)
  @IsString({ each: true })
  gearKeys?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: CUSTOM_GEAR_MAX_ITEMS })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(LIST_CAP)
  @IsString({ each: true })
  @MaxLength(TEXT_CAP, { each: true })
  customGear?: string[];

  @ApiPropertyOptional({ maxLength: DESCRIPTION_MAX })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_CAP)
  description?: string;
}

export class AdminGroupTripsQueryDto {
  @ApiPropertyOptional({
    enum: GROUP_TRIP_STATUSES,
    enumName: 'GroupTripStatus',
  })
  @IsOptional()
  @IsIn(GROUP_TRIP_STATUSES)
  status?: GroupTripStatusCode;

  @ApiPropertyOptional({ description: 'nextCursor from the previous page.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string;
}

export class AdminCancelGroupTripDto {
  @ApiProperty({ maxLength: ADMIN_NOTE_MAX })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(ADMIN_NOTE_MAX)
  note: string;
}

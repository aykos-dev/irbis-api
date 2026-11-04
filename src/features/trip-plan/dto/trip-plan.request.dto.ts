import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
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
  ACCURACY_MAX_M,
  CLIMB_MAX_M,
  DISTANCE_MAX_M,
  NAME_MAX,
  PING_ACCURACY_MAX_M,
  RELATION_MAX,
} from '../trip-plan.constants.js';

const UZ_PHONE = /^\+998\d{9}$/;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class TripPreviewQueryDto {
  @ApiProperty({ format: 'date-time' })
  @IsISO8601({ strict: true })
  startAt: string;

  @ApiProperty({ format: 'date-time', description: 'After startAt.' })
  @IsISO8601({ strict: true })
  backBy: string;
}

export class PutEmergencyContactDto {
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

export class TripLocationDto {
  @ApiProperty({ minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiProperty({ minimum: 0, maximum: ACCURACY_MAX_M })
  @IsNumber()
  @Min(0)
  @Max(ACCURACY_MAX_M)
  accuracyM: number;
}

export class CreateTripDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  placeId: string;

  @ApiProperty({ format: 'date-time' })
  @IsISO8601({ strict: true })
  startAt: string;

  @ApiProperty({ format: 'date-time', description: 'After startAt.' })
  @IsISO8601({ strict: true })
  backBy: string;

  @ApiProperty()
  @IsBoolean()
  alertEnabled: boolean;

  @ApiProperty({ description: 'true: the trip starts now (status active).' })
  @IsBoolean()
  start: boolean;

  @ApiPropertyOptional({
    type: TripLocationDto,
    description: 'Device position; stored only when start is true.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TripLocationDto)
  location?: TripLocationDto;
}

export class StartTripDto {
  @ApiPropertyOptional({
    type: TripLocationDto,
    description: 'Device position at start, used for the alert link.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TripLocationDto)
  location?: TripLocationDto;
}

export class UpdateTripDto {
  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Planned trips only.',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  startAt?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description:
      'Active trips: after now and within maxDurationH of startAt, until the alert is sent.',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  backBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  alertEnabled?: boolean;
}

/** AC3: one location ping with the client's running trip totals. */
export class PostTripLocationDto {
  @ApiProperty({ minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiProperty({ minimum: 0, maximum: PING_ACCURACY_MAX_M })
  @IsNumber()
  @Min(0)
  @Max(PING_ACCURACY_MAX_M)
  accuracyM: number;

  @ApiProperty({
    format: 'date-time',
    description:
      'When the fix was taken: not before startedAt, at most 2 min ahead of the server.',
  })
  @IsISO8601({ strict: true })
  recordedAt: string;

  @ApiProperty({ type: 'integer', minimum: 0, maximum: DISTANCE_MAX_M })
  @IsInt()
  @Min(0)
  @Max(DISTANCE_MAX_M)
  distanceM: number;

  @ApiProperty({ type: 'integer', minimum: 0, maximum: CLIMB_MAX_M })
  @IsInt()
  @Min(0)
  @Max(CLIMB_MAX_M)
  climbM: number;
}

/** AC8: optional final trip totals sent with check-out. */
export class CheckOutTripDto {
  @ApiPropertyOptional({ type: 'integer', minimum: 0, maximum: DISTANCE_MAX_M })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(DISTANCE_MAX_M)
  distanceM?: number;

  @ApiPropertyOptional({ type: 'integer', minimum: 0, maximum: CLIMB_MAX_M })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(CLIMB_MAX_M)
  climbM?: number;
}

export class CheckInWaypointDto {
  @ApiProperty({ minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiProperty({
    minimum: 0,
    maximum: PING_ACCURACY_MAX_M,
    description: 'Above the configured maximum (50 m) → LOCATION_INACCURATE.',
  })
  @IsNumber()
  @Min(0)
  @Max(PING_ACCURACY_MAX_M)
  accuracyM: number;

  @ApiProperty({
    format: 'date-time',
    description:
      'When the fix was taken: not before startedAt, at most 2 min ahead of the server (queued check-ins may arrive late).',
  })
  @IsISO8601({ strict: true })
  recordedAt: string;
}

/** Optional device fix; without one the SMS uses the last ping, the start fix or the place. */
export class SendSosDto {
  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: PING_ACCURACY_MAX_M })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(PING_ACCURACY_MAX_M)
  accuracyM?: number;
}

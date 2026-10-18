import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HAZARDS, PLACE_TYPES } from '../../places/places.constants.js';
import type {
  HazardCode,
  PlaceTypeCode,
} from '../../places/places.constants.js';
import {
  CLOSURE_SOURCES,
  CONDITION_SOURCES,
  CONDITION_STATUSES,
  HAZARD_LEVELS,
  REASON_CODES,
  type ClosureSourceCode,
  type ConditionSourceCode,
  type ConditionStatusCode,
  type HazardLevelCode,
  type ReasonCode,
  type WeekendDayName,
} from '../conditions.constants.js';

const DAYS = ['sat', 'sun'] as const;

export class LocalizedTextDto {
  @ApiProperty() uz: string;
  @ApiProperty({ type: String, nullable: true }) ru: string | null;
  @ApiProperty({ type: String, nullable: true }) en: string | null;
}

export class ConditionReasonDto {
  @ApiProperty({ enum: REASON_CODES, enumName: 'ConditionReasonCode' })
  code: ReasonCode;

  @ApiPropertyOptional({ enum: DAYS, enumName: 'WeekendDayName' })
  day?: WeekendDayName;

  @ApiPropertyOptional({
    type: 'integer',
    description: 'The measured value (km/h, mm, %, °C, cm or WMO code).',
  })
  value?: number;
}

export class HazardLevelDto {
  @ApiProperty({ enum: HAZARDS, enumName: 'Hazard' }) hazard: HazardCode;

  @ApiProperty({ enum: HAZARD_LEVELS, enumName: 'HazardLevel' })
  level: HazardLevelCode;
}

export class WeekendDayDto {
  @ApiProperty({ example: '2026-10-24' }) date: string;
  @ApiProperty({ enum: DAYS, enumName: 'WeekendDayName' }) day: WeekendDayName;
  @ApiProperty({ type: 'integer' }) weatherCode: number;
  @ApiProperty({ type: 'integer' }) tMaxC: number;
  @ApiProperty({ type: 'integer' }) tMinC: number;
  @ApiProperty({ type: 'integer' }) windKmh: number;
  @ApiProperty({ type: 'integer' }) gustKmh: number;
  @ApiProperty({ type: 'integer' }) precipMm: number;
  @ApiProperty({ type: 'integer' }) precipProbPct: number;
  @ApiProperty({ type: 'integer' }) snowCm: number;
}

export class PlaceConditionDto {
  @ApiProperty({ format: 'uuid' }) placeId: string;

  @ApiProperty({
    enum: CONDITION_STATUSES,
    enumName: 'ConditionStatus',
    nullable: true,
  })
  status: ConditionStatusCode | null;

  @ApiProperty({
    enum: CONDITION_SOURCES,
    enumName: 'ConditionSource',
    nullable: true,
  })
  source: ConditionSourceCode | null;

  @ApiProperty({
    type: [ConditionReasonDto],
    description: 'Worst first, at most 3.',
  })
  reasons: ConditionReasonDto[];

  @ApiProperty({
    type: LocalizedTextDto,
    nullable: true,
    description: 'Closure / override reason when source is closure / manual.',
  })
  text: LocalizedTextDto | null;

  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: 12,
    nullable: true,
    description: 'Next open month (Asia/Tashkent) for seasonal_lock.',
  })
  opensMonth: number | null;

  @ApiProperty({ type: [HazardLevelDto] }) hazards: HazardLevelDto[];
  @ApiProperty({ type: [WeekendDayDto] }) weekend: WeekendDayDto[];

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  forecastAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  computedAt: Date | null;
}

export class AdminConditionRowDto {
  @ApiProperty({ format: 'uuid' }) placeId: string;
  @ApiProperty() slug: string;
  @ApiProperty({ type: LocalizedTextDto }) name: LocalizedTextDto;

  @ApiProperty({ enum: PLACE_TYPES, enumName: 'PlaceType' })
  type: PlaceTypeCode;

  @ApiProperty({
    enum: CONDITION_STATUSES,
    enumName: 'ConditionStatus',
    nullable: true,
  })
  status: ConditionStatusCode | null;

  @ApiProperty({
    enum: CONDITION_SOURCES,
    enumName: 'ConditionSource',
    nullable: true,
  })
  source: ConditionSourceCode | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  computedAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  forecastAt: Date | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  activeClosureId: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  activeOverrideId: string | null;
}

export class AdminConditionListResponseDto {
  @ApiProperty({ type: [AdminConditionRowDto] }) items: AdminConditionRowDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor: string | null;

  @ApiProperty({ type: 'integer', description: 'Places matching the filter.' })
  total: number;
}

export class ClosureDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) placeId: string;
  @ApiProperty({ type: String, format: 'date-time' }) startsAt: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  endsAt: Date | null;

  @ApiProperty({ type: LocalizedTextDto }) reason: LocalizedTextDto;

  @ApiProperty({ enum: CLOSURE_SOURCES, enumName: 'ClosureSource' })
  source: ClosureSourceCode;

  @ApiProperty({ type: String, format: 'date-time' }) createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  endedAt: Date | null;

  @ApiProperty({ description: 'Not ended, started, and endsAt not passed.' })
  active: boolean;
}

export class OverrideDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) placeId: string;

  @ApiProperty({ enum: CONDITION_STATUSES, enumName: 'ConditionStatus' })
  status: ConditionStatusCode;

  @ApiProperty({ type: LocalizedTextDto }) reason: LocalizedTextDto;
  @ApiProperty({ type: String, format: 'date-time' }) expiresAt: Date;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  endedAt: Date | null;

  @ApiProperty({ description: 'Not ended and not expired.' })
  active: boolean;
}

export class ConditionControlsDto {
  @ApiProperty({ type: PlaceConditionDto }) condition: PlaceConditionDto;

  @ApiProperty({ type: [ClosureDto], description: 'Newest first.' })
  closures: ClosureDto[];

  @ApiProperty({ type: [OverrideDto], description: 'Newest first.' })
  overrides: OverrideDto[];
}

export class RecomputeStartedDto {
  @ApiProperty({ type: String, format: 'date-time' }) startedAt: Date;
}

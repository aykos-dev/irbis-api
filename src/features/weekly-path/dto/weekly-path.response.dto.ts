import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CONDITION_STATUSES,
  REASON_CODES,
  type ConditionStatusCode,
  type ReasonCode,
  type WeekendDayName,
} from '../../conditions/conditions.constants.js';
import {
  PLACE_TYPES,
  type PlaceTypeCode,
} from '../../places/places.constants.js';
import { WEATHER_DAYS, type WeatherDayName } from '../weekly-path.constants.js';

const WEEKEND_DAYS = ['sat', 'sun'] as const;

export class PathPlaceNameDto {
  @ApiProperty() uz: string;
  @ApiProperty({ type: String, nullable: true }) ru: string | null;
  @ApiProperty({ type: String, nullable: true }) en: string | null;
}

export class PathPlaceDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() slug: string;
  @ApiProperty({ type: PathPlaceNameDto }) name: PathPlaceNameDto;

  @ApiProperty({ enum: PLACE_TYPES, enumName: 'PlaceType' })
  type: PlaceTypeCode;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 5 })
  difficulty: number;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 7 })
  requiredLevel: number;

  @ApiProperty({ type: 'integer' }) elevationM: number;
}

export class PathReasonDto {
  @ApiProperty({ enum: REASON_CODES, enumName: 'ConditionReasonCode' })
  code: ReasonCode;

  @ApiPropertyOptional({ enum: WEEKEND_DAYS, enumName: 'WeekendDayName' })
  day?: WeekendDayName;

  @ApiPropertyOptional({ type: 'integer' })
  value?: number;
}

export class PathSwapDto {
  @ApiProperty({ type: PathPlaceDto }) place: PathPlaceDto;

  @ApiProperty({ enum: ['go'] }) status: 'go';

  @ApiProperty({ enum: WEEKEND_DAYS, enumName: 'WeekendDayName' })
  day: WeekendDayName;

  @ApiProperty({ type: 'integer', description: 'From the original node, km.' })
  distanceFromOriginalKm: number;

  @ApiProperty({
    type: 'integer',
    description: 'Swap elevation minus the original, metres.',
  })
  elevationDiffM: number;
}

export class PathNodeDto {
  @ApiProperty({ type: 'integer', minimum: 1 }) position: number;
  @ApiProperty({ type: PathPlaceDto }) place: PathPlaceDto;

  @ApiProperty({
    enum: CONDITION_STATUSES,
    enumName: 'ConditionStatus',
    nullable: true,
    description: 'Current condition; null when none was computed.',
  })
  status: ConditionStatusCode | null;

  @ApiProperty({ type: [PathReasonDto] }) reasons: PathReasonDto[];

  @ApiProperty({ enum: WEEKEND_DAYS, enumName: 'WeekendDayName' })
  weekendDay: WeekendDayName;

  @ApiProperty({
    type: 'integer',
    nullable: true,
    minimum: 1,
    maximum: 12,
    description: 'Next open month when the status is seasonal_lock.',
  })
  opensMonth: number | null;

  @ApiProperty({ description: 'Visited this month.' }) done: boolean;

  @ApiProperty({
    type: PathSwapDto,
    nullable: true,
    description: 'Only for a not_now node; null when no go place fits.',
  })
  swap: PathSwapDto | null;
}

export class PathChestDto {
  @ApiProperty({ type: 'integer' }) required: number;
  @ApiProperty({ type: 'integer' }) done: number;
  @ApiProperty() opened: boolean;
  @ApiProperty({ type: 'integer' }) xp: number;
}

export class PathWeatherDayDto {
  @ApiProperty({ format: 'date' }) date: string;

  @ApiProperty({ enum: WEATHER_DAYS, enumName: 'PathWeatherDayName' })
  day: WeatherDayName;

  @ApiProperty({ type: 'integer', description: 'WMO weather code.' })
  weatherCode: number;

  @ApiProperty({ type: 'integer' }) tMaxC: number;
  @ApiProperty({ type: 'integer' }) windKmh: number;
}

export class PathWeatherDto {
  @ApiProperty({ type: [PathWeatherDayDto] }) days: PathWeatherDayDto[];
}

export class PathDto {
  @ApiProperty({ example: '2026-10', description: 'Asia/Tashkent month.' })
  month: string;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 7 }) level: number;
  @ApiProperty({ type: [PathNodeDto] }) nodes: PathNodeDto[];

  @ApiProperty({
    type: PathChestDto,
    nullable: true,
    description: 'Null when the path has no nodes.',
  })
  chest: PathChestDto | null;

  @ApiProperty({ type: PathWeatherDto }) weather: PathWeatherDto;
}

export class PathLevelUpDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: 'integer' }) fromLevel: number;
  @ApiProperty({ type: 'integer' }) toLevel: number;
}

export class PathChestOpenDto {
  @ApiProperty() opened: boolean;

  @ApiProperty({
    type: 'integer',
    description: 'XP this call awarded; 0 when the chest was already open.',
  })
  xp: number;

  @ApiProperty({ type: [PathLevelUpDto] }) levelUps: PathLevelUpDto[];
}

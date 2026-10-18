import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
  CONDITION_STATUSES,
  type ConditionStatusCode,
} from '../../conditions/conditions.constants.js';
import {
  HAZARDS,
  PLACE_ORIGINS,
  PLACE_TYPES,
  SEASON_STATUSES,
  type HazardCode,
  type PlaceOrigin,
  type PlaceTypeCode,
  type SeasonStatusCode,
} from '../places.constants.js';

export class PlaceNameDto {
  @ApiProperty() uz: string;
  @ApiProperty({ type: String, nullable: true }) ru: string | null;
  @ApiProperty({ type: String, nullable: true }) en: string | null;
}

export class PlaceDescriptionDto {
  @ApiProperty({ type: String, nullable: true, description: 'Markdown.' })
  uz: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Markdown.' })
  ru: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Markdown.' })
  en: string | null;
}

export class PlaceListItemDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'qorangur-2941' }) slug: string;
  @ApiProperty({ type: PlaceNameDto }) name: PlaceNameDto;

  @ApiProperty({ enum: PLACE_TYPES, enumName: 'PlaceType' })
  type: PlaceTypeCode;

  @ApiProperty() latitude: number;
  @ApiProperty() longitude: number;
  @ApiProperty({ type: 'integer' }) elevationM: number;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 5 })
  difficulty: number;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 7 })
  requiredLevel: number;

  @ApiProperty({
    type: 'integer',
    description: 'Great-circle distance from the origin, metres.',
  })
  distanceM: number;

  @ApiPropertyOptional({
    enum: CONDITION_STATUSES,
    enumName: 'ConditionStatus',
    nullable: true,
    description:
      'Weekend condition. Absent until one was computed for the place; null when there is no status.',
  })
  conditionStatus?: ConditionStatusCode | null;
}

export class PlaceListResponseDto {
  @ApiProperty({ type: [PlaceListItemDto] }) items: PlaceListItemDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor: string | null;

  @ApiProperty({ enum: PLACE_ORIGINS, enumName: 'PlaceOrigin' })
  origin: PlaceOrigin;

  @ApiProperty({ type: 'integer', description: 'Places matching the filters.' })
  total: number;
}

export class PlaceViewerDto {
  @ApiProperty({ type: 'integer' }) level: number;

  @ApiProperty({ description: 'requiredLevel <= level.' })
  qualifies: boolean;
}

export class PlaceDetailDto extends OmitType(PlaceListItemDto, [
  'conditionStatus',
] as const) {
  @ApiProperty({ type: String, nullable: true }) region: string | null;

  @ApiProperty({ type: PlaceDescriptionDto })
  description: PlaceDescriptionDto;

  @ApiProperty({
    enum: SEASON_STATUSES,
    enumName: 'SeasonStatus',
    isArray: true,
    description: 'Empty (not set yet) or 12 months, January first.',
  })
  season: SeasonStatusCode[];

  @ApiProperty({ enum: HAZARDS, enumName: 'Hazard', isArray: true })
  hazards: HazardCode[];

  @ApiProperty({ enum: PLACE_ORIGINS, enumName: 'PlaceOrigin' })
  origin: PlaceOrigin;

  @ApiProperty({ type: PlaceViewerDto }) viewer: PlaceViewerDto;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CONDITION_STATUSES,
  type ConditionStatusCode,
} from '../../conditions/conditions.constants.js';
import {
  PLACE_TYPES,
  type PlaceTypeCode,
} from '../../places/places.constants.js';

/** The place fields the Search screen renders; mirrors the Places list item. */
export class SearchPlaceNameDto {
  @ApiProperty() uz: string;

  @ApiProperty({ type: String, nullable: true })
  ru: string | null;

  @ApiProperty({ type: String, nullable: true })
  en: string | null;
}

export class SearchPlaceDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'qorangur-2941' })
  slug: string;

  @ApiProperty({ type: SearchPlaceNameDto })
  name: SearchPlaceNameDto;

  @ApiProperty({ enum: PLACE_TYPES, enumName: 'PlaceType' })
  type: PlaceTypeCode;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty({ type: 'integer' })
  elevationM: number;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 5 })
  difficulty: number;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 7 })
  requiredLevel: number;

  @ApiProperty({ type: 'integer', description: 'Metres from the search origin.' })
  distanceM: number;

  @ApiPropertyOptional({
    enum: CONDITION_STATUSES,
    enumName: 'ConditionStatus',
    nullable: true,
  })
  conditionStatus?: ConditionStatusCode | null;
}

export class SearchPersonDto {
  @ApiProperty({ example: 'guest_1' })
  username: string;

  @ApiProperty({ type: String, nullable: true, maxLength: 40 })
  displayName: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Null when no avatar is set or storage is unavailable.',
  })
  avatarUrl: string | null;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 7 })
  level: number;
}

export class SearchResultsDto {
  @ApiProperty({ type: [SearchPlaceDto] })
  places: SearchPlaceDto[];

  @ApiProperty({ type: [SearchPersonDto] })
  people: SearchPersonDto[];

  @ApiProperty({
    type: [String],
    description: 'Always empty until groups ship.',
  })
  groups: string[];

  @ApiProperty({
    type: [String],
    description: 'Always empty until tours ship.',
  })
  tours: string[];
}

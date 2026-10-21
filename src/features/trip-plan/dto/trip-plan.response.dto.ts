import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PLACE_TYPES,
  type PlaceTypeCode,
} from '../../places/places.constants.js';
import {
  GEAR_KEYS,
  GEAR_NOTES,
  TRIP_STATUSES,
  type GearKey,
  type GearNote,
  type TripStatusCode,
} from '../trip-plan.constants.js';

export class GearItemDto {
  @ApiProperty({ enum: GEAR_KEYS, enumName: 'GearKey' }) key: GearKey;

  @ApiPropertyOptional({ description: 'Water only, litres in 0.5 steps.' })
  litres?: number;

  @ApiPropertyOptional({ enum: GEAR_NOTES, enumName: 'GearNote' })
  note?: GearNote;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'With note `sunset`: the sunset time.',
  })
  noteTime?: Date;
}

export class TripPreviewDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Sunset at the place on the start date (Asia/Tashkent).',
  })
  sunsetAt: Date;

  @ApiProperty({
    type: 'integer',
    nullable: true,
    description:
      'Minutes from backBy to sunset (negative = after dark); null when backBy is on a later day.',
  })
  daylightBufferMin: number | null;

  @ApiProperty({ type: [GearItemDto] }) gear: GearItemDto[];
}

export class EmergencyContactDto {
  @ApiProperty() name: string;
  @ApiProperty() relation: string;
  @ApiProperty({ example: '+998 •• ••• •• 41' }) phoneMasked: string;
}

export class TripPlaceDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() slug: string;
  @ApiProperty() nameUz: string;
  @ApiProperty({ type: String, nullable: true }) nameRu: string | null;
  @ApiProperty({ type: String, nullable: true }) nameEn: string | null;
  @ApiProperty({ enum: PLACE_TYPES, enumName: 'PlaceType' })
  type: PlaceTypeCode;
  @ApiProperty() latitude: number;
  @ApiProperty() longitude: number;
}

export class TripDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: TripPlaceDto }) place: TripPlaceDto;
  @ApiProperty({ enum: TRIP_STATUSES, enumName: 'TripStatus' })
  status: TripStatusCode;
  @ApiProperty({ type: String, format: 'date-time' }) startAt: Date;
  @ApiProperty({ type: String, format: 'date-time' }) backBy: Date;
  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'backBy + trip.config alertDelayMin.',
  })
  alertAt: Date;
  @ApiProperty() alertEnabled: boolean;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startedAt: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  checkedOutAt: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  alertSentAt: Date | null;
  @ApiProperty({ type: EmergencyContactDto }) contact: EmergencyContactDto;
}

export class CurrentTripsDto {
  @ApiProperty({ type: TripDto, nullable: true }) active: TripDto | null;
  @ApiProperty({ type: [TripDto] }) planned: TripDto[];
}

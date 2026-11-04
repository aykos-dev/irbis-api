import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PLACE_TYPES,
  type PlaceTypeCode,
} from '../../places/places.constants.js';
import {
  GEAR_KEYS,
  GEAR_NOTES,
  LIVE_TRIP_STATUSES,
  TRIP_STATUSES,
  type GearKey,
  type GearNote,
  type LiveTripStatusCode,
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

export class TripWaypointDto {
  @ApiProperty({ type: 'integer' }) n: number;
  @ApiProperty() lat: number;
  @ApiProperty() lng: number;
  @ApiProperty({ type: String, format: 'date-time' }) recordedAt: Date;
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
  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Public live page link for active, alerted and checked-out trips.',
  })
  liveUrl: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastLocationAt: Date | null;
  @ApiProperty({ type: 'integer' }) distanceM: number;
  @ApiProperty({ type: 'integer' }) climbM: number;
  @ApiProperty({ type: [TripWaypointDto] }) waypoints: TripWaypointDto[];
  @ApiProperty({
    type: 'integer',
    description:
      'trip.active pingEveryMin: how often the app sends a location.',
  })
  pingEveryMin: number;
}

export class CurrentTripsDto {
  @ApiProperty({ type: TripDto, nullable: true }) active: TripDto | null;
  @ApiProperty({ type: [TripDto] }) planned: TripDto[];
}

export class LivePlaceNamesDto {
  @ApiProperty() uz: string;
  @ApiProperty({ description: 'Falls back to uz.' }) ru: string;
  @ApiProperty({ description: 'Falls back to uz.' }) en: string;
}

/** AC5: what the public live page may show. Never contact details or ids. */
export class LiveTripDto {
  @ApiProperty({ description: 'Display name, else username.' })
  displayName: string;
  @ApiProperty({ type: LivePlaceNamesDto }) placeNames: LivePlaceNamesDto;
  @ApiProperty({ type: String, format: 'date-time' }) backBy: Date;
  @ApiProperty({ enum: LIVE_TRIP_STATUSES, enumName: 'LiveTripStatus' })
  status: LiveTripStatusCode;
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Absent once the link has ended.',
  })
  lastLocationAt?: Date;
  @ApiPropertyOptional({ description: 'Absent once the link has ended.' })
  mapsUrl?: string;
}

export class WaypointResultDto {
  @ApiProperty({ type: TripWaypointDto }) waypoint: TripWaypointDto;
  @ApiProperty({
    type: 'integer',
    description: 'XP the ledger granted; 0 when the daily cap is used up.',
  })
  xpAwarded: number;
}

export class SosResultDto {
  @ApiProperty({ type: String, format: 'date-time' }) sentAt: Date;
  @ApiProperty() contactName: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Rescue number to dial (E.164); null when not configured.',
  })
  sosCallNumber: string | null;
}

export class SosContactDto {
  @ApiProperty({ description: 'Emergency contact phone, full E.164.' })
  phone: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Rescue number to dial (E.164); null when not configured.',
  })
  sosCallNumber: string | null;
}

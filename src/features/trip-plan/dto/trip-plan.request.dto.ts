import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
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
  NAME_MAX,
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

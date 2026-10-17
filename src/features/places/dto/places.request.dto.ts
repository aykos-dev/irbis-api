import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { PLACE_TYPES, type PlaceTypeCode } from '../places.constants.js';

/** Accepts `types=peak&types=lake` and `types=peak,lake`. */
function toList({ value }: { value: unknown }): unknown {
  if (value === undefined) return undefined;
  const raw: unknown[] = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((item) => (typeof item === 'string' ? item.split(',') : [item]))
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter((item) => item !== '');
}

@ValidatorConstraint({ name: 'notBelowMin' })
class NotBelowDifficultyMin implements ValidatorConstraintInterface {
  validate(max: unknown, args: ValidationArguments): boolean {
    const { difficultyMin } = args.object as PlacesQueryDto;
    return (
      typeof max !== 'number' ||
      typeof difficultyMin !== 'number' ||
      difficultyMin <= max
    );
  }

  defaultMessage(): string {
    return 'difficultyMax must not be below difficultyMin';
  }
}

/** Optional device position; both or neither. Without it the origin is Tashkent. */
export class PlaceOriginQueryDto {
  @ApiPropertyOptional({
    minimum: -90,
    maximum: 90,
    description: 'Device latitude; send together with lng.',
  })
  @ValidateIf(
    (o: PlaceOriginQueryDto) => o.lat !== undefined || o.lng !== undefined,
  )
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({
    minimum: -180,
    maximum: 180,
    description: 'Device longitude; send together with lat.',
  })
  @ValidateIf(
    (o: PlaceOriginQueryDto) => o.lat !== undefined || o.lng !== undefined,
  )
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}

export class PlacesQueryDto extends PlaceOriginQueryDto {
  @ApiPropertyOptional({
    enum: PLACE_TYPES,
    enumName: 'PlaceType',
    isArray: true,
    description: 'Any of these types. Repeat the key or send a comma list.',
  })
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @ArrayMaxSize(PLACE_TYPES.length)
  @IsIn(PLACE_TYPES, { each: true })
  types?: PlaceTypeCode[];

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  difficultyMin?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 5,
    description: '≥ difficultyMin.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @Validate(NotBelowDifficultyMin)
  difficultyMax?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 1000,
    description: 'Inclusive distance limit from the origin, km.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  maxDistanceKm?: number;

  @ApiPropertyOptional({
    description: "Opaque; the previous page's nextCursor.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

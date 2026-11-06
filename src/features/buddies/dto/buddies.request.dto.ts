import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  HOME_REGIONS,
  type HomeRegionCode,
} from '../../../common/profile.constants.js';
import { INTERESTS, type InterestCode } from '../../auth/auth.constants.js';
import {
  BUDDY_LEVEL_FILTERS,
  RATING_MAX,
  RATING_MIN,
  type BuddyLevelFilter,
} from '../buddies.constants.js';

/** Query strings arrive as text: only the literal 'true'/'false' become booleans. */
const queryBoolean = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

/** `a,b` → ['a', 'b']; an array (repeated key) is kept. */
const commaList = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== '')
    : value;

export class FindBuddiesQueryDto {
  @ApiPropertyOptional({
    enum: BUDDY_LEVEL_FILTERS,
    enumName: 'BuddyLevelFilter',
    default: 'any',
  })
  @IsOptional()
  @IsIn(BUDDY_LEVEL_FILTERS)
  level?: BuddyLevelFilter;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Only people free Sat or Sun this Asia/Tashkent week.',
  })
  @IsOptional()
  @Transform(queryBoolean)
  @IsBoolean()
  weekend?: boolean;

  @ApiPropertyOptional({
    enum: HOME_REGIONS,
    enumName: 'HomeRegion',
    description: 'Matches only people who show their home region.',
  })
  @IsOptional()
  @IsIn(HOME_REGIONS)
  region?: HomeRegionCode;

  @ApiPropertyOptional({
    type: String,
    example: 'peaks,lakes',
    description: `Comma-separated, any overlap: ${INTERESTS.join(', ')}.`,
  })
  @IsOptional()
  @Transform(commaList)
  @IsArray()
  @ArrayMaxSize(INTERESTS.length)
  @IsIn(INTERESTS, { each: true })
  interests?: InterestCode[];

  @ApiPropertyOptional({ description: 'nextCursor from the previous page.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;
}

export class AvailabilityInputDto {
  @ApiProperty() @IsBoolean() sat: boolean;
  @ApiProperty() @IsBoolean() sun: boolean;
}

export class BuddyRequestInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId: string;
}

export class TripRatingInputDto {
  @ApiProperty({ type: 'integer', minimum: RATING_MIN, maximum: RATING_MAX })
  @IsInt()
  @Min(RATING_MIN)
  @Max(RATING_MAX)
  reliable: number;

  @ApiProperty({ type: 'integer', minimum: RATING_MIN, maximum: RATING_MAX })
  @IsInt()
  @Min(RATING_MIN)
  @Max(RATING_MAX)
  safety: number;

  @ApiProperty({ type: 'integer', minimum: RATING_MIN, maximum: RATING_MAX })
  @IsInt()
  @Min(RATING_MIN)
  @Max(RATING_MAX)
  company: number;
}

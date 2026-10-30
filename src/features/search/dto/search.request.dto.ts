import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { SEARCH_SCOPES, type SearchScope } from '../search.constants.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Optional device position for distance labels; both or neither. */
export class SearchQueryDto {
  @ApiPropertyOptional({
    minLength: 2,
    maxLength: 60,
    description: 'Trimmed before matching; 2–60 characters.',
  })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  q: string;

  @ApiPropertyOptional({
    enum: SEARCH_SCOPES,
    enumName: 'SearchScope',
    default: 'all',
  })
  @IsOptional()
  @IsIn(SEARCH_SCOPES)
  scope?: SearchScope;

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @ValidateIf((o: SearchQueryDto) => o.lat !== undefined || o.lng !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @ValidateIf((o: SearchQueryDto) => o.lat !== undefined || o.lng !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}

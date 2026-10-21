import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  HOME_REGIONS,
  type HomeRegionCode,
} from '../../../common/profile.constants.js';
import {
  INTERESTS,
  LOCALES,
  type InterestCode,
  type LocaleCode,
} from '../../auth/auth.constants.js';

const MAX_INTERESTS = 5;

/** Strings are trimmed before validation, so trailing spaces cannot break the limits. */
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Partial profile update. An empty name or bio clears the field. */
export class UpdateMeDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    minLength: 2,
    maxLength: 40,
    description: '2–40 characters; empty or null clears it.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  @ValidateIf((dto: UpdateMeDto) => dto.displayName !== '')
  @MinLength(2)
  displayName?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 150,
    description: 'At most 150 characters; empty or null clears it.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  bio?: string | null;

  @ApiPropertyOptional({
    enum: HOME_REGIONS,
    enumName: 'HomeRegion',
    nullable: true,
    description: 'A region or null to clear it.',
  })
  @IsOptional()
  @IsIn(HOME_REGIONS)
  homeRegion?: HomeRegionCode | null;

  @ApiPropertyOptional({
    enum: INTERESTS,
    enumName: 'Interest',
    isArray: true,
    maxItems: MAX_INTERESTS,
    uniqueItems: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_INTERESTS)
  @ArrayUnique()
  @IsIn(INTERESTS, { each: true })
  interests?: InterestCode[];

  @ApiPropertyOptional({ enum: LOCALES, enumName: 'Locale' })
  @IsOptional()
  @IsIn(LOCALES)
  locale?: LocaleCode;
}

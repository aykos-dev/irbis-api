import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ADMIN_CONDITIONS_DEFAULT_LIMIT,
  ADMIN_CONDITIONS_MAX_LIMIT,
  ADMIN_STATUS_FILTERS,
  CLOSURE_SOURCES,
  CONDITION_STATUSES,
  REASON_TEXT_MAX,
  type AdminStatusFilter,
  type ClosureSourceCode,
  type ConditionStatusCode,
} from '../conditions.constants.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Trimmed; blank counts as not sent. */
const trimOptional = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export class IdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;
}

export class AdminConditionsQueryDto {
  @ApiPropertyOptional({
    enum: ADMIN_STATUS_FILTERS,
    enumName: 'AdminConditionStatusFilter',
    description: 'A status, or `none` for places without one.',
  })
  @IsOptional()
  @IsIn(ADMIN_STATUS_FILTERS)
  status?: AdminStatusFilter;

  @ApiPropertyOptional({
    description: "Opaque; the previous page's nextCursor.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  cursor?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: ADMIN_CONDITIONS_MAX_LIMIT,
    default: ADMIN_CONDITIONS_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ADMIN_CONDITIONS_MAX_LIMIT)
  limit?: number;
}

export class ReasonInputDto {
  @ApiProperty({ minLength: 1, maxLength: REASON_TEXT_MAX })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(REASON_TEXT_MAX)
  uz: string;

  @ApiPropertyOptional({ maxLength: REASON_TEXT_MAX })
  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(REASON_TEXT_MAX)
  ru?: string;

  @ApiPropertyOptional({ maxLength: REASON_TEXT_MAX })
  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(REASON_TEXT_MAX)
  en?: string;
}

export class CreateClosureDto {
  @ApiProperty({ format: 'date-time' })
  @IsISO8601({ strict: true })
  startsAt: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'After startsAt. Omit for an open-ended closure.',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  endsAt?: string;

  @ApiProperty({ type: ReasonInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ReasonInputDto)
  reason: ReasonInputDto;

  @ApiProperty({ enum: CLOSURE_SOURCES, enumName: 'ClosureSource' })
  @IsIn(CLOSURE_SOURCES)
  source: ClosureSourceCode;
}

export class CreateOverrideDto {
  @ApiProperty({ enum: CONDITION_STATUSES, enumName: 'ConditionStatus' })
  @IsIn(CONDITION_STATUSES)
  status: ConditionStatusCode;

  @ApiProperty({ type: ReasonInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ReasonInputDto)
  reason: ReasonInputDto;

  @ApiProperty({
    format: 'date-time',
    description: 'After now and at most 14 days ahead.',
  })
  @IsISO8601({ strict: true })
  expiresAt: string;
}

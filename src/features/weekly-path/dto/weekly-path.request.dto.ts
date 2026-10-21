import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { INTERESTS, type InterestCode } from '../../auth/auth.constants.js';

/** Accepts `interests=peaks&interests=lakes` and `interests=peaks,lakes`. */
function toList({ value }: { value: unknown }): unknown {
  if (value === undefined) return undefined;
  const raw: unknown[] = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((item) => (typeof item === 'string' ? item.split(',') : [item]))
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter((item) => item !== '');
}

export class PathQueryDto {
  @ApiPropertyOptional({
    enum: INTERESTS,
    enumName: 'Interest',
    isArray: true,
    description:
      'Guests only (ignored when signed in). Comma list; empty or absent means every type.',
  })
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @ArrayMaxSize(INTERESTS.length)
  @IsIn(INTERESTS, { each: true })
  interests?: InterestCode[];
}

export class PathVisitDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  placeId: string;
}

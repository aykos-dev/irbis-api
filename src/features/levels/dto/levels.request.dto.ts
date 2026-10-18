import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_DIFFICULTY, MIN_DIFFICULTY } from '../levels.constants.js';

export const QA_GRANT_MAX_XP = 20_000;
export const QA_GRANT_MAX_ITEMS = 50;
export const QA_GRANT_MAX_VERIFIED_SPOTS = 10;

export class LevelUpIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;
}

export class QaGrantLessonDto {
  @ApiProperty({ minLength: 1, maxLength: 20, example: '2' })
  @IsString()
  @Length(1, 20)
  tier: string;
}

export class QaGrantCheckInDto {
  @ApiProperty({
    type: 'integer',
    minimum: MIN_DIFFICULTY,
    maximum: MAX_DIFFICULTY,
  })
  @IsInt()
  @Min(MIN_DIFFICULTY)
  @Max(MAX_DIFFICULTY)
  difficulty: number;
}

export class QaGrantDto {
  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: QA_GRANT_MAX_XP,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(QA_GRANT_MAX_XP)
  xp?: number;

  @ApiPropertyOptional({
    type: [QaGrantLessonDto],
    maxItems: QA_GRANT_MAX_ITEMS,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(QA_GRANT_MAX_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => QaGrantLessonDto)
  lessons?: QaGrantLessonDto[];

  @ApiPropertyOptional({
    type: [QaGrantCheckInDto],
    maxItems: QA_GRANT_MAX_ITEMS,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(QA_GRANT_MAX_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => QaGrantCheckInDto)
  checkIns?: QaGrantCheckInDto[];

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 0,
    maximum: QA_GRANT_MAX_VERIFIED_SPOTS,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(QA_GRANT_MAX_VERIFIED_SPOTS)
  verifiedSpots?: number;
}

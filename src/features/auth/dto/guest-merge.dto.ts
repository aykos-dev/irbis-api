import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import {
  EXPERIENCES,
  INTERESTS,
  LOCALES,
  MAX_INTERESTS,
  type ExperienceCode,
  type InterestCode,
  type LocaleCode,
} from '../auth.constants.js';

/** Onboarding choices the guest made on the device. */
export class GuestOnboardingDto {
  @ApiPropertyOptional({ enum: EXPERIENCES, enumName: 'Experience' })
  @IsOptional()
  @IsIn(EXPERIENCES)
  experience?: ExperienceCode;

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
}

export const GUEST_LESSON_COMPLETIONS_MAX = 200;

/** Lesson runs finished as a guest. Each item is checked by the lessons handler; bad items are skipped. */
export class GuestLessonsDto {
  @ApiProperty({
    type: 'array',
    items: { $ref: '#/components/schemas/CompletionInput' },
    maxItems: GUEST_LESSON_COMPLETIONS_MAX,
  })
  @IsArray()
  @ArrayMaxSize(GUEST_LESSON_COMPLETIONS_MAX)
  @IsObject({ each: true })
  completions: object[];
}

/** Guest data kept on the device. Features add their own optional property and register a handler. */
export class GuestMergeDto {
  @ApiPropertyOptional({
    enum: LOCALES,
    enumName: 'Locale',
    description:
      'Accepted and validated, never written: the account keeps the language set at sign-up.',
  })
  @IsOptional()
  @IsIn(LOCALES)
  locale?: LocaleCode;

  @ApiPropertyOptional({ type: GuestOnboardingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuestOnboardingDto)
  onboarding?: GuestOnboardingDto;

  @ApiPropertyOptional({ type: GuestLessonsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuestLessonsDto)
  lessons?: GuestLessonsDto;
}

export class GuestMergeResponseDto {
  @ApiProperty({
    type: [String],
    example: ['onboarding'],
    description: 'Parts that were merged.',
  })
  merged: string[];

  @ApiProperty({
    type: [String],
    example: ['locale'],
    description: 'Parts that were accepted but not written to the account.',
  })
  skipped: string[];
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
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

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional } from 'class-validator';
import { LOCALES, type LocaleCode } from '../auth.constants.js';

/** Guest data kept on the device. Features add their own optional property and register a handler. */
export class GuestMergeDto {
  @ApiPropertyOptional({ enum: LOCALES, enumName: 'Locale' })
  @IsOptional()
  @IsIn(LOCALES)
  locale?: LocaleCode;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description:
      'Onboarding choices; accepted now, merged once the onboarding feature registers its handler.',
  })
  @IsOptional()
  @IsObject()
  onboarding?: Record<string, unknown>;
}

export class GuestMergeResponseDto {
  @ApiProperty({
    type: [String],
    example: ['locale'],
    description: 'Parts that were merged.',
  })
  merged: string[];

  @ApiProperty({
    type: [String],
    example: ['onboarding'],
    description: 'Parts nothing handles yet.',
  })
  skipped: string[];
}

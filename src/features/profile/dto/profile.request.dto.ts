import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  APPEARANCES,
  HOME_REGIONS,
  UNITS,
  type AppearanceCode,
  type HomeRegionCode,
  type UnitsCode,
} from '../../../common/profile.constants.js';
import {
  INTERESTS,
  LOCALES,
  type InterestCode,
  type LocaleCode,
} from '../../auth/auth.constants.js';

const MAX_INTERESTS = 5;

/** 24-hour Asia/Tashkent time for the daily game reminder. */
const DAILY_GAME_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Strings are trimmed before validation, so trailing spaces cannot break the limits. */
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** The writable notification switches. Trip & safety is always on and not part of the input. */
export class NotificationPreferencesInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  streakReminders?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dailyGame?: boolean;

  @ApiPropertyOptional({
    example: '19:00',
    description: '24-hour HH:MM in Asia/Tashkent.',
  })
  @IsOptional()
  @IsString()
  @Matches(DAILY_GAME_TIME)
  dailyGameTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  groupsMessages?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  social?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  offers?: boolean;
}

/** The writable privacy switches. Share location is read-only and always `trips`. */
export class PrivacyPreferencesInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  publicProfile?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  findBuddies?: boolean;
}

/** Partial settings update: only the keys sent are applied. */
export class MePreferencesInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showStats?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showHomeRegion?: boolean;

  @ApiPropertyOptional({ enum: UNITS, enumName: 'Units' })
  @IsOptional()
  @IsIn(UNITS)
  units?: UnitsCode;

  @ApiPropertyOptional({ enum: APPEARANCES, enumName: 'Appearance' })
  @IsOptional()
  @IsIn(APPEARANCES)
  appearance?: AppearanceCode;

  @ApiPropertyOptional({ type: NotificationPreferencesInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesInputDto)
  notifications?: NotificationPreferencesInputDto;

  @ApiPropertyOptional({ type: PrivacyPreferencesInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PrivacyPreferencesInputDto)
  privacy?: PrivacyPreferencesInputDto;
}

/** Partial profile update. An empty name or bio clears the field. */
export class UpdateMeDto {
  @ApiPropertyOptional({
    description:
      'Case-insensitive; changing it requires currentPassword and ends other sessions.',
    maxLength: 20,
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(64)
  username?: string;

  @ApiPropertyOptional({
    format: 'password',
    writeOnly: true,
    description: 'Required only when the username changes.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  currentPassword?: string;

  @ApiPropertyOptional({ type: MePreferencesInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MePreferencesInputDto)
  preferences?: MePreferencesInputDto;

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

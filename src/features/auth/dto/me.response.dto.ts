import { ApiProperty } from '@nestjs/swagger';
import {
  APPEARANCES,
  HOME_REGIONS,
  UNITS,
  type AppearanceCode,
  type HomeRegionCode,
  type UnitsCode,
} from '../../../common/profile.constants.js';
import {
  EXPERIENCES,
  INTERESTS,
  LOCALES,
  USER_ROLES,
} from '../auth.constants.js';

/** Notification settings as the app sees them. Trip & safety is always on. */
export class NotificationPreferencesDto {
  @ApiProperty({
    description: 'Trip & safety alerts; always on and not writable.',
  })
  tripSafety: boolean;

  @ApiProperty() streakReminders: boolean;
  @ApiProperty() dailyGame: boolean;

  @ApiProperty({ example: '19:00', description: 'Asia/Tashkent, HH:MM.' })
  dailyGameTime: string;

  @ApiProperty() groupsMessages: boolean;
  @ApiProperty() social: boolean;
  @ApiProperty() offers: boolean;
}

export class PrivacyPreferencesDto {
  @ApiProperty() publicProfile: boolean;
  @ApiProperty() findBuddies: boolean;

  @ApiProperty({
    enum: ['trips'],
    enumName: 'ShareLocation',
    description: 'Always trips for now; not writable.',
  })
  shareLocation: 'trips';
}

export class MePreferencesDto {
  @ApiProperty() showStats: boolean;
  @ApiProperty() showHomeRegion: boolean;

  @ApiProperty({ enum: UNITS, enumName: 'Units' })
  units: UnitsCode;

  @ApiProperty({ enum: APPEARANCES, enumName: 'Appearance' })
  appearance: AppearanceCode;

  @ApiProperty({ type: NotificationPreferencesDto })
  notifications: NotificationPreferencesDto;

  @ApiProperty({ type: PrivacyPreferencesDto })
  privacy: PrivacyPreferencesDto;
}

export class MeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'guest_1' })
  username: string;

  @ApiProperty({ type: String, nullable: true, maxLength: 40 })
  displayName: string | null;

  @ApiProperty({ type: String, nullable: true, maxLength: 150 })
  bio: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Derived from the stored avatar key; null when unset or storage is unavailable.',
  })
  avatarUrl: string | null;

  @ApiProperty({
    enum: HOME_REGIONS,
    enumName: 'HomeRegion',
    nullable: true,
  })
  homeRegion: HomeRegionCode | null;

  @ApiProperty({ enum: LOCALES, enumName: 'Locale' })
  locale: (typeof LOCALES)[number];

  @ApiProperty({ enum: EXPERIENCES, enumName: 'Experience', nullable: true })
  experience: (typeof EXPERIENCES)[number] | null;

  @ApiProperty({ enum: INTERESTS, enumName: 'Interest', isArray: true })
  interests: (typeof INTERESTS)[number][];

  @ApiProperty({ enum: USER_ROLES, enumName: 'Role' })
  role: (typeof USER_ROLES)[number];

  @ApiProperty({
    description:
      'Demo account (ADR-006): auto username, no password; secure it with POST /v1/me/secure.',
  })
  isDemo: boolean;

  @ApiProperty({ description: 'A verified recovery phone exists.' })
  hasRecoveryPhone: boolean;

  @ApiProperty({
    description:
      'A recovery phone was added and its code is waiting to be verified.',
  })
  recoveryPhonePending: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 7, example: 1 })
  level: number;

  @ApiProperty({ type: 'integer', description: 'Lifetime XP.' })
  xpTotal: number;

  @ApiProperty({ type: MePreferencesDto })
  preferences: MePreferencesDto;
}

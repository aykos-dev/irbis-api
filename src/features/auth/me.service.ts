import { Injectable, UnauthorizedException } from '@nestjs/common';
import type {
  AppearanceCode,
  HomeRegionCode,
  UnitsCode,
} from '../../common/profile.constants.js';
import { StorageService } from '../../lib/storage/storage.service.js';
import { StorageUnavailableError } from '../../lib/storage/storage.errors.js';
import { AuthRepository } from './auth.repository.js';
import type {
  ExperienceCode,
  InterestCode,
  LocaleCode,
  UserRole,
} from './auth.constants.js';
import type { MePreferencesDto, MeResponseDto } from './dto/me.response.dto.js';

/** The account columns `/v1/me` reads; both auth and profile repositories return this shape. */
export interface MeUser {
  id: string;
  username: string;
  locale: LocaleCode;
  experience: ExperienceCode | null;
  interests: InterestCode[];
  role: UserRole;
  recoveryPhone: string | null;
  recoveryPhoneVerifiedAt: Date | null;
  createdAt: Date;
  level: number;
  xpTotal: number;
  displayName: string | null;
  bio: string | null;
  avatarKey: string | null;
  homeRegion: HomeRegionCode | null;
  showStats: boolean;
  showHomeRegion: boolean;
  units: UnitsCode;
  appearance: AppearanceCode;
  notifyStreak: boolean;
  notifyDailyGame: boolean;
  dailyGameTime: string;
  notifyGroups: boolean;
  notifySocial: boolean;
  notifyOffers: boolean;
  publicProfile: boolean;
  findBuddies: boolean;
}

// The profile slice's PATCH /v1/me returns this shape; exposed through the service boundary.
export { MeResponseDto } from './dto/me.response.dto.js';

/** The signed-in user's own profile view. */
@Injectable()
export class MeService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly storage: StorageService,
  ) {}

  async getMe(userId: string): Promise<MeResponseDto> {
    const user = await this.repository.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.toMe(user, new Date());
  }

  async toMe(user: MeUser, now: Date): Promise<MeResponseDto> {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: this.avatarUrl(user.avatarKey),
      homeRegion: user.homeRegion,
      locale: user.locale,
      experience: user.experience,
      interests: user.interests,
      role: user.role,
      hasRecoveryPhone:
        user.recoveryPhone !== null && user.recoveryPhoneVerifiedAt !== null,
      recoveryPhonePending: await this.repository.hasPendingPhoneCode(
        user.id,
        now,
      ),
      createdAt: user.createdAt.toISOString(),
      level: user.level,
      xpTotal: user.xpTotal,
      preferences: toPreferences(user),
    };
  }

  /** A storage outage must never fail `/v1/me`: the avatar just falls back to initials. */
  private avatarUrl(key: string | null): string | null {
    if (key === null) return null;
    try {
      return this.storage.publicUrl(key);
    } catch (error) {
      if (error instanceof StorageUnavailableError) return null;
      throw error;
    }
  }
}

function toPreferences(user: MeUser): MePreferencesDto {
  return {
    showStats: user.showStats,
    showHomeRegion: user.showHomeRegion,
    units: user.units,
    appearance: user.appearance,
    notifications: {
      tripSafety: true,
      streakReminders: user.notifyStreak,
      dailyGame: user.notifyDailyGame,
      dailyGameTime: user.dailyGameTime,
      groupsMessages: user.notifyGroups,
      social: user.notifySocial,
      offers: user.notifyOffers,
    },
    privacy: {
      publicProfile: user.publicProfile,
      findBuddies: user.findBuddies,
      shareLocation: 'trips',
    },
  };
}

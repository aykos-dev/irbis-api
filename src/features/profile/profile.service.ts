import { randomBytes, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  HOME_REGIONS,
  type HomeRegionCode,
} from '../../common/profile.constants.js';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import { StorageService } from '../../lib/storage/storage.service.js';
import { StorageUnavailableError } from '../../lib/storage/storage.errors.js';
import {
  INTERESTS,
  LOCALES,
  type InterestCode,
  type LocaleCode,
} from '../auth/auth.constants.js';
import { AuthService } from '../auth/auth.service.js';
import {
  UsernameInvalidError,
  UsernameReservedError,
  UsernameTakenError,
} from '../auth/auth.errors.js';
import { MeService } from '../auth/me.service.js';
import { PasswordService } from '../auth/password.service.js';
import { normalizeUsername, usernameProblem } from '../auth/username.rules.js';
import type { DeleteAccountDto } from './dto/delete-account.dto.js';
import type { MePreferencesInputDto } from './dto/profile.request.dto.js';
import type { MeResponseDto } from './dto/profile.response.dto.js';
import type { PublicProfileResponseDto } from './dto/public-profile.response.dto.js';
import type { UpdateMeDto } from './dto/profile.request.dto.js';
import { ProfileAvatarService } from './profile-avatar.service.js';
import {
  InvalidPasswordError,
  ProfileNotFoundError,
} from './profile.errors.js';
import {
  ProfileRepository,
  type ProfileUpdate,
  type PublicProfileRecord,
} from './profile.repository.js';

const MAX_INTERESTS = 5;
const MAX_DISPLAY_NAME = 40;
const MIN_DISPLAY_NAME = 2;
const MAX_BIO = 150;
/** 48 random bits; a collision is vanishingly rare, but the unique index still gets a retry. */
const ANONYMIZED_USERNAME_ATTEMPTS = 3;

/** Profile edits and the public profile view. */
@Injectable()
export class ProfileService {
  constructor(
    private readonly repository: ProfileRepository,
    private readonly me: MeService,
    private readonly storage: StorageService,
    private readonly auth: AuthService,
    private readonly passwords: PasswordService,
    private readonly avatars: ProfileAvatarService,
  ) {}

  /** Applies only the fields present and answers the updated `/v1/me` body. */
  async updateMe(
    userId: string,
    sessionId: string | undefined,
    dto: UpdateMeDto,
  ): Promise<MeResponseDto> {
    const data = toUpdate(dto);
    if (dto.preferences) {
      Object.assign(data, preferencesUpdate(dto.preferences));
    }
    if (dto.username !== undefined) {
      await this.changeUsername(
        userId,
        sessionId,
        dto.username,
        dto.currentPassword,
      );
    }
    await this.repository.update(userId, data);
    return this.me.getMe(userId);
  }

  /** AC3: stores the re-encoded square JPEG under a fresh key and answers the updated `/v1/me`. */
  async uploadAvatar(
    userId: string,
    file: Buffer | undefined,
  ): Promise<MeResponseDto> {
    if (!file) throw invalid('file', 'required');
    const avatarKey = await this.avatars.upload(file);
    await this.repository.update(userId, { avatarKey });
    return this.me.getMe(userId);
  }

  /** AC3: clears the key only; the stored object is left orphaned (ADR-005). */
  async removeAvatar(userId: string): Promise<MeResponseDto> {
    await this.repository.update(userId, { avatarKey: null });
    return this.me.getMe(userId);
  }

  /**
   * AC8: confirms the password, then anonymises the account and ends every session in one
   * transaction. The row and its avatar stay; access tokens die through `checkSession`.
   */
  async deleteAccount(userId: string, dto: DeleteAccountDto): Promise<void> {
    if (!dto.currentPassword) {
      throw invalid('currentPassword', 'required');
    }
    const identity = await this.repository.findIdentity(userId);
    if (!identity) throw new UnauthorizedException();
    if (
      !(await this.passwords.verify(identity.passwordHash, dto.currentPassword))
    ) {
      throw new InvalidPasswordError();
    }

    const deletedAt = new Date();
    const passwordHash = await this.passwords.hash(randomUUID() + randomUUID());
    for (let attempt = 0; ; attempt += 1) {
      try {
        await this.repository.anonymizeAccount(userId, {
          username: anonymizedUsername(),
          passwordHash,
          deletedAt,
        });
        return;
      } catch (error) {
        if (
          !(error instanceof UsernameTakenError) ||
          attempt >= ANONYMIZED_USERNAME_ATTEMPTS - 1
        ) {
          throw error;
        }
      }
    }
  }

  /**
   * AC2: a different normalized username needs the current password, is stored lowercase and
   * ends every other session (the auth service keeps this one through `sessionId`).
   */
  private async changeUsername(
    userId: string,
    sessionId: string | undefined,
    rawUsername: string,
    currentPassword: string | undefined,
  ): Promise<void> {
    const username = normalizeUsername(rawUsername.trim());
    const identity = await this.repository.findIdentity(userId);
    if (!identity) throw new UnauthorizedException();
    if (username === identity.username) return;

    const problem = usernameProblem(username);
    if (problem === 'reserved') throw new UsernameReservedError();
    if (problem) throw new UsernameInvalidError(problem);
    if (currentPassword === undefined) {
      throw new RequestValidationError({ currentPassword: ['required'] });
    }
    if (
      !(await this.passwords.verify(identity.passwordHash, currentPassword))
    ) {
      throw new InvalidPasswordError();
    }
    await this.auth.changeUsername(userId, username, sessionId);
  }

  /** Case-insensitive lookup. Missing, deleted, blocked and private are one indistinguishable 404. */
  async getPublicProfile(
    rawUsername: string,
  ): Promise<PublicProfileResponseDto> {
    const username = rawUsername.trim().toLowerCase();
    const user = await this.repository.findPublicByUsername(username);
    if (!user || !isVisible(user)) throw new ProfileNotFoundError();
    return {
      username: user.username,
      displayName: user.displayName,
      avatarUrl: this.avatarUrl(user.avatarKey),
      bio: user.bio,
      homeRegion: user.showHomeRegion ? user.homeRegion : null,
      level: user.level,
      createdAt: user.createdAt.toISOString(),
      showStats: user.showStats,
    };
  }

  /** Storage being down must not make the public profile fail: the app shows initials. */
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

function isVisible(user: PublicProfileRecord): boolean {
  return (
    user.deletedAt === null && user.blockedAt === null && user.publicProfile
  );
}

function toUpdate(dto: UpdateMeDto): ProfileUpdate {
  const data: ProfileUpdate = {};
  if (dto.displayName !== undefined) {
    data.displayName = cleanText(
      dto.displayName,
      'displayName',
      MAX_DISPLAY_NAME,
      MIN_DISPLAY_NAME,
    );
  }
  if (dto.bio !== undefined) {
    data.bio = cleanText(dto.bio, 'bio', MAX_BIO);
  }
  if (dto.homeRegion !== undefined) {
    data.homeRegion = region(dto.homeRegion);
  }
  if (dto.interests !== undefined) {
    data.interests = interests(dto.interests);
  }
  if (dto.locale !== undefined) {
    data.locale = locale(dto.locale);
  }
  return data;
}

/** Trims; an empty value clears to null; otherwise enforces the length limits. */
function cleanText(
  value: string | null,
  field: string,
  max: number,
  min = 0,
): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw invalid(field, 'isString');
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (trimmed.length < min) throw invalid(field, 'minLength');
  if (trimmed.length > max) throw invalid(field, 'maxLength');
  return trimmed;
}

function region(value: HomeRegionCode | null): HomeRegionCode | null {
  if (value === null) return null;
  if (!(HOME_REGIONS as readonly string[]).includes(value)) {
    throw invalid('homeRegion', 'isIn');
  }
  return value;
}

function interests(value: InterestCode[]): InterestCode[] {
  if (!Array.isArray(value)) throw invalid('interests', 'isArray');
  if (value.length > MAX_INTERESTS) throw invalid('interests', 'arrayMaxSize');
  if (new Set(value).size !== value.length) {
    throw invalid('interests', 'arrayUnique');
  }
  for (const interest of value) {
    if (!(INTERESTS as readonly string[]).includes(interest)) {
      throw invalid('interests', 'isIn');
    }
  }
  return [...value];
}

function locale(value: LocaleCode): LocaleCode {
  if (!(LOCALES as readonly string[]).includes(value)) {
    throw invalid('locale', 'isIn');
  }
  return value;
}

/** AC6: maps only the keys the caller sent. Trip & safety and share location are read-only. */
function preferencesUpdate(preferences: MePreferencesInputDto): ProfileUpdate {
  const data: ProfileUpdate = {};
  const { notifications, privacy } = preferences;
  if (preferences.showStats !== undefined) {
    data.showStats = preferences.showStats;
  }
  if (preferences.showHomeRegion !== undefined) {
    data.showHomeRegion = preferences.showHomeRegion;
  }
  if (preferences.units !== undefined) {
    data.units = preferences.units;
  }
  if (preferences.appearance !== undefined) {
    data.appearance = preferences.appearance;
  }
  if (notifications) {
    if (notifications.streakReminders !== undefined) {
      data.notifyStreak = notifications.streakReminders;
    }
    if (notifications.dailyGame !== undefined) {
      data.notifyDailyGame = notifications.dailyGame;
    }
    if (notifications.dailyGameTime !== undefined) {
      data.dailyGameTime = notifications.dailyGameTime;
    }
    if (notifications.groupsMessages !== undefined) {
      data.notifyGroups = notifications.groupsMessages;
    }
    if (notifications.social !== undefined) {
      data.notifySocial = notifications.social;
    }
    if (notifications.offers !== undefined) {
      data.notifyOffers = notifications.offers;
    }
  }
  if (privacy) {
    if (privacy.publicProfile !== undefined) {
      data.publicProfile = privacy.publicProfile;
    }
    if (privacy.findBuddies !== undefined) {
      data.findBuddies = privacy.findBuddies;
    }
  }
  return data;
}

/** `deleted_` + 12 lowercase hex = 20 chars, matching the username column and rules. */
function anonymizedUsername(): string {
  return `deleted_${randomBytes(6).toString('hex')}`;
}

function invalid(field: string, problem: string): RequestValidationError {
  return new RequestValidationError({ [field]: [problem] });
}

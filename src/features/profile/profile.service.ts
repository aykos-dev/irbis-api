import { Injectable } from '@nestjs/common';
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
import { MeService } from '../auth/me.service.js';
import type { MeResponseDto } from './dto/profile.response.dto.js';
import type { PublicProfileResponseDto } from './dto/public-profile.response.dto.js';
import type { UpdateMeDto } from './dto/profile.request.dto.js';
import { ProfileNotFoundError } from './profile.errors.js';
import {
  ProfileRepository,
  type ProfileUpdate,
  type PublicProfileRecord,
} from './profile.repository.js';

const MAX_INTERESTS = 5;
const MAX_DISPLAY_NAME = 40;
const MIN_DISPLAY_NAME = 2;
const MAX_BIO = 150;

/** Profile edits and the public profile view. */
@Injectable()
export class ProfileService {
  constructor(
    private readonly repository: ProfileRepository,
    private readonly me: MeService,
    private readonly storage: StorageService,
  ) {}

  /** Applies only the fields present and answers the updated `/v1/me` body. */
  async updateMe(userId: string, dto: UpdateMeDto): Promise<MeResponseDto> {
    await this.repository.update(userId, toUpdate(dto));
    return this.me.getMe(userId);
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

function invalid(field: string, problem: string): RequestValidationError {
  return new RequestValidationError({ [field]: [problem] });
}

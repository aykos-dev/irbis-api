import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type HomeRegion,
  type Interest,
  type Locale,
} from '../../generated/prisma/client.js';
import {
  type AppearanceCode,
  type UnitsCode,
} from '../../common/profile.constants.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsernameTakenError } from '../auth/auth.errors.js';

/** The columns PATCH /v1/me may write. Username is changed through the auth service. */
export interface ProfileUpdate {
  displayName?: string | null;
  bio?: string | null;
  avatarKey?: string | null;
  homeRegion?: HomeRegion | null;
  interests?: Interest[];
  locale?: Locale;
  showStats?: boolean;
  showHomeRegion?: boolean;
  units?: UnitsCode;
  appearance?: AppearanceCode;
  notifyStreak?: boolean;
  notifyDailyGame?: boolean;
  dailyGameTime?: string;
  notifyGroups?: boolean;
  notifySocial?: boolean;
  notifyOffers?: boolean;
  publicProfile?: boolean;
  findBuddies?: boolean;
}

const identitySelect = {
  username: true,
  passwordHash: true,
} satisfies Prisma.UserSelect;

export type IdentityRecord = Prisma.UserGetPayload<{
  select: typeof identitySelect;
}>;

const publicProfileSelect = {
  username: true,
  displayName: true,
  avatarKey: true,
  bio: true,
  homeRegion: true,
  showHomeRegion: true,
  level: true,
  createdAt: true,
  showStats: true,
  publicProfile: true,
  blockedAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

export type PublicProfileRecord = Prisma.UserGetPayload<{
  select: typeof publicProfileSelect;
}>;

/** Everything the AC8 deletion overwrites; the caller has already prepared the values. */
export interface AccountAnonymization {
  username: string;
  passwordHash: string;
  deletedAt: Date;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/** Profile columns on User, the public lookup and the account deletion transaction. */
@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async update(userId: string, data: ProfileUpdate): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data });
  }

  /** The current username and password hash, for the AC2 confirmation check. */
  findIdentity(userId: string): Promise<IdentityRecord | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: identitySelect,
    });
  }

  /** Usernames are stored lowercase; callers normalise the parameter first. */
  findPublicByUsername(username: string): Promise<PublicProfileRecord | null> {
    return this.prisma.user.findUnique({
      where: { username },
      select: publicProfileSelect,
    });
  }

  /**
   * AC8: anonymises the row, replaces the password hash and revokes every refresh token in one
   * transaction. The user row and the avatar object stay (ADR-005). A username collision answers
   * USERNAME_TAKEN so the service can draw another random one.
   */
  async anonymizeAccount(
    userId: string,
    data: AccountAnonymization,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            username: data.username,
            passwordHash: data.passwordHash,
            deletedAt: data.deletedAt,
            displayName: null,
            bio: null,
            avatarKey: null,
            homeRegion: null,
            interests: [],
            experience: null,
            recoveryPhone: null,
            recoveryPhoneVerifiedAt: null,
          },
        });
        await tx.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: data.deletedAt },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new UsernameTakenError();
      throw error;
    }
  }
}

import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type HomeRegion,
  type Interest,
  type Locale,
  type PlaceType,
} from '../../generated/prisma/client.js';
import {
  type AppearanceCode,
  type UnitsCode,
} from '../../common/profile.constants.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsernameTakenError } from '../auth/auth.errors.js';

/** Profile stats in canonical metric units. */
export interface ProfileStatsRecord {
  peaks: number;
  lakes: number;
  caves: number;
  walkedM: number;
  climbedM: number;
  spots: number;
}

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

  /** The id and visibility flags for `GET /v1/users/:username/stats`. */
  findPublicStatsTarget(
    username: string,
  ): Promise<{
    id: string;
    showStats: boolean;
    publicProfile: boolean;
    blockedAt: Date | null;
    deletedAt: Date | null;
  } | null> {
    return this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        showStats: true,
        publicProfile: true,
        blockedAt: true,
        deletedAt: true,
      },
    });
  }

  /** All-time stats: distinct counted places by type, trip totals and verified spots. */
  async stats(userId: string): Promise<ProfileStatsRecord> {
    const [checkIns, trips, spots] = await Promise.all([
      this.prisma.checkIn.findMany({
        where: { userId, counted: true },
        select: { placeId: true, place: { select: { type: true } } },
      }),
      this.prisma.trip.aggregate({
        where: { userId, checkedOutAt: { not: null } },
        _sum: { distanceM: true, climbM: true },
      }),
      this.prisma.levelFact.count({ where: { userId, kind: 'verified_spot' } }),
    ]);
    // One visit per place counts, even when it was checked in across months.
    const types = new Map<string, PlaceType>();
    for (const checkIn of checkIns) {
      if (!types.has(checkIn.placeId)) types.set(checkIn.placeId, checkIn.place.type);
    }
    const count = (type: PlaceType): number =>
      [...types.values()].filter((value) => value === type).length;
    return {
      peaks: count('peak'),
      lakes: count('lake'),
      caves: count('cave'),
      walkedM: trips._sum.distanceM ?? 0,
      climbedM: trips._sum.climbM ?? 0,
      spots,
    };
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

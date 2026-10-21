import { Injectable } from '@nestjs/common';
import type {
  HomeRegion,
  Interest,
  Locale,
  Prisma,
} from '../../generated/prisma/client.js';
import {
  type AppearanceCode,
  type UnitsCode,
} from '../../common/profile.constants.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** The columns PATCH /v1/me may write. Username is changed through the auth service. */
export interface ProfileUpdate {
  displayName?: string | null;
  bio?: string | null;
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

/** Profile columns on User and the public lookup. */
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
}

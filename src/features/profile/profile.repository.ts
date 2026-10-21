import { Injectable } from '@nestjs/common';
import type {
  HomeRegion,
  Interest,
  Locale,
  Prisma,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface ProfileUpdate {
  displayName?: string | null;
  bio?: string | null;
  homeRegion?: HomeRegion | null;
  interests?: Interest[];
  locale?: Locale;
}

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

  /** Usernames are stored lowercase; callers normalise the parameter first. */
  findPublicByUsername(username: string): Promise<PublicProfileRecord | null> {
    return this.prisma.user.findUnique({
      where: { username },
      select: publicProfileSelect,
    });
  }
}

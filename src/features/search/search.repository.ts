import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface PersonSearchRow {
  username: string;
  displayName: string | null;
  avatarKey: string | null;
  level: number;
}

/** Public, findable people only; deleted and blocked accounts never appear. */
@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPeople(
    term: string,
    excludeUserId: string | undefined,
    take: number,
  ): Promise<PersonSearchRow[]> {
    return this.prisma.user.findMany({
      where: {
        publicProfile: true,
        findBuddies: true,
        deletedAt: null,
        blockedAt: null,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        OR: [
          { username: { contains: term, mode: 'insensitive' } },
          { displayName: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: {
        username: true,
        displayName: true,
        avatarKey: true,
        level: true,
      },
      orderBy: [{ username: 'asc' }],
      take,
    });
  }
}

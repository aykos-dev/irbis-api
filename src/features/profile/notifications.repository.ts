import { Injectable } from '@nestjs/common';
import type {
  Locale,
  Notification,
  NotificationCategory,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Re-exported so the service layer never imports the Prisma client itself (ADR-002). */
export type NotificationRow = Notification;
export type NotificationLocale = Locale;

/** Keyset position: rows come after this (older createdAt, then smaller id). */
export interface NotificationCursor {
  createdAt: Date;
  id: string;
}

export interface NotificationPageQuery {
  category?: NotificationCategory;
  cursor?: NotificationCursor;
  /** Already includes the extra row the service uses to detect another page. */
  take: number;
}

/** The only Prisma user for notifications (and the account locale they are rendered in). */
@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPage(
    userId: string,
    query: NotificationPageQuery,
  ): Promise<NotificationRow[]> {
    const { category, cursor, take } = query;
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(category ? { category } : {}),
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    });
  }

  countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async findLocale(userId: string): Promise<NotificationLocale | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { locale: true },
    });
    return user?.locale ?? null;
  }

  /** Returns how many unread rows this call touched, for the current user only. */
  async markAllRead(userId: string, readAt: Date): Promise<number> {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt },
    });
    return count;
  }
}

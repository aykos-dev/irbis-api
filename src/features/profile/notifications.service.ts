import { Injectable } from '@nestjs/common';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import { decodeCursor, encodeCursor } from '../../lib/cursor.js';
import {
  NOTIFICATIONS_DEFAULT_LIMIT,
  type NotificationsQueryDto,
} from './dto/notifications.request.dto.js';
import type {
  NotificationItemDto,
  NotificationsListResponseDto,
  NotificationsReadAllResponseDto,
} from './dto/notifications.response.dto.js';
import {
  type NotificationCursor,
  type NotificationLocale,
  type NotificationRow,
  NotificationsRepository,
} from './notifications.repository.js';

/** AC7: the user's notifications inbox and mark-all-read. */
@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  async list(
    userId: string,
    query: NotificationsQueryDto,
  ): Promise<NotificationsListResponseDto> {
    const cursor = parseCursor(query.cursor);
    const limit = query.limit ?? NOTIFICATIONS_DEFAULT_LIMIT;
    const [rows, unreadCount, locale] = await Promise.all([
      this.repository.findPage(userId, {
        category: query.category,
        cursor,
        take: limit + 1,
      }),
      this.repository.countUnread(userId),
      this.repository.findLocale(userId),
    ]);

    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map((row) => toItem(row, locale ?? 'en')),
      nextCursor:
        rows.length > limit && last
          ? encodeCursor({
              createdAt: last.createdAt.toISOString(),
              id: last.id,
            })
          : null,
      unreadCount,
    };
  }

  async markAllRead(userId: string): Promise<NotificationsReadAllResponseDto> {
    const updated = await this.repository.markAllRead(userId, new Date());
    return { updated };
  }
}

function parseCursor(raw: string | undefined): NotificationCursor | undefined {
  if (!raw) return undefined;
  const payload = decodeCursor(raw);
  const createdAt =
    typeof payload?.createdAt === 'string'
      ? new Date(payload.createdAt)
      : null;
  const id =
    typeof payload?.id === 'string' && payload.id !== '' ? payload.id : null;
  if (!createdAt || Number.isNaN(createdAt.getTime()) || !id) {
    throw new RequestValidationError({ cursor: ['invalid'] });
  }
  return { createdAt, id };
}

function toItem(row: NotificationRow, locale: NotificationLocale): NotificationItemDto {
  return {
    id: row.id,
    category: row.category,
    kind: row.kind,
    title: localized(row.title, locale) ?? '',
    body: localized(row.body, locale),
    data: row.data,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** `{ uz, ru, en }` JSON → the account locale, then `en`, then the first string. */
function localized(value: unknown, locale: NotificationLocale): string | null {
  if (typeof value === 'string') return value;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  for (const key of [locale, 'en']) {
    const candidate = record[key];
    if (typeof candidate === 'string') return candidate;
  }
  return (
    Object.values(record).find((entry): entry is string => {
      return typeof entry === 'string';
    }) ?? null
  );
}

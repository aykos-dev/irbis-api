import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RequestValidationError } from '../../../common/errors/validation.error.js';
import { encodeCursor } from '../../../lib/cursor.js';
import {
  NotificationsQueryDto,
  NOTIFICATIONS_MAX_LIMIT,
} from '../dto/notifications.request.dto.js';
import type {
  NotificationLocale,
  NotificationPageQuery,
  NotificationRow,
  NotificationsRepository,
} from '../notifications.repository.js';
import { NotificationsService } from '../notifications.service.js';

const USER = 'user_1';
const AT = new Date('2026-10-21T10:00:00.000Z');

function notification(
  id: string,
  overrides: Partial<NotificationRow> = {},
): NotificationRow {
  return {
    id,
    userId: USER,
    category: 'trips',
    kind: 'trip_reminder',
    title: { en: 'Trip' },
    body: null,
    data: null,
    readAt: null,
    createdAt: AT,
    ...overrides,
  };
}

function setup(
  rows: NotificationRow[] = [],
  options: {
    unread?: number;
    locale?: NotificationLocale | null;
    updated?: number;
  } = {},
) {
  const pages: { userId: string; query: NotificationPageQuery }[] = [];
  const marks: { userId: string; readAt: Date }[] = [];
  const repo = {
    findPage: (userId: string, query: NotificationPageQuery) => {
      pages.push({ userId, query });
      return Promise.resolve(rows);
    },
    countUnread: () => Promise.resolve(options.unread ?? 0),
    findLocale: () =>
      Promise.resolve(options.locale === undefined ? 'en' : options.locale),
    markAllRead: (userId: string, readAt: Date) => {
      marks.push({ userId, readAt });
      return Promise.resolve(options.updated ?? 0);
    },
  };
  const service = new NotificationsService(
    repo as unknown as NotificationsRepository,
  );
  return { service, pages, marks };
}

const dto = (data: Partial<NotificationsQueryDto> = {}) =>
  Object.assign(new NotificationsQueryDto(), data);

describe('NotificationsService.list (AC7)', () => {
  it('keeps repository order and forwards the category filter with limit + 1', async () => {
    const rows = [
      notification('c', { category: 'trips' }),
      notification('b', { category: 'trips' }),
      notification('a', { category: 'social' }),
    ];
    const { service, pages } = setup(rows, { unread: 7 });
    const result = await service.list(USER, dto({ category: 'trips' }));

    expect(pages[0]).toMatchObject({
      userId: USER,
      query: { category: 'trips', take: 21 },
    });
    expect(pages[0]?.query.cursor).toBeUndefined();
    expect(result.items.map((item) => item.id)).toEqual(['c', 'b', 'a']);
    expect(result.nextCursor).toBeNull();
  });

  it('clamps the page to the limit and sets nextCursor only when another page exists', async () => {
    const rows = [
      notification('c'),
      notification('b'),
      notification('a'),
    ];
    const { service } = setup(rows);
    const first = await service.list(USER, dto({ limit: 2 }));

    expect(first.items.map((item) => item.id)).toEqual(['c', 'b']);
    expect(first.nextCursor).not.toBeNull();

    const exact = await service.list(USER, dto({ limit: 3 }));
    expect(exact.items).toHaveLength(3);
    expect(exact.nextCursor).toBeNull();
  });

  it('round-trips the opaque cursor and rejects a malformed one', async () => {
    const rows = [notification('b'), notification('a')];
    const { service, pages } = setup(rows);
    const first = await service.list(USER, dto({ limit: 1 }));
    const cursor = first.nextCursor as string;

    await service.list(USER, dto({ limit: 1, cursor }));
    expect(pages[1]?.query.cursor).toEqual({
      createdAt: rows[0]?.createdAt,
      id: 'b',
    });

    for (const bad of ['not-a-cursor', encodeCursor({ offset: 3 })]) {
      await expect(
        service.list(USER, dto({ cursor: bad })),
      ).rejects.toMatchObject({
        status: 400,
        fieldErrors: { cursor: ['invalid'] },
      });
    }
    await expect(
      service.list(USER, dto({ cursor: 'not-a-cursor' })),
    ).rejects.toBeInstanceOf(RequestValidationError);
  });

  it('reports the total unread count regardless of the category filter', async () => {
    const { service } = setup([notification('a')], {
      unread: 9,
      locale: 'en',
    });
    const result = await service.list(USER, dto({ category: 'social' }));
    expect(result.unreadCount).toBe(9);
  });

  it('localizes title and body, falling back to en then any language', async () => {
    const rows = [
      notification('uz', {
        title: { uz: 'Safar', ru: 'Поездка', en: 'Trip' },
        body: { uz: 'Eslatma', en: 'Reminder' },
      }),
      notification('fallback-en', { title: { ru: 'Поездка', en: 'Trip' } }),
      notification('fallback-first', {
        title: { ru: 'Поездка' },
        body: null,
      }),
    ];
    const { service } = setup(rows, { locale: 'uz' });
    const result = await service.list(USER, dto());

    expect(result.items[0]).toMatchObject({
      title: 'Safar',
      body: 'Eslatma',
    });
    expect(result.items[1]).toMatchObject({ title: 'Trip', body: null });
    expect(result.items[2]).toMatchObject({ title: 'Поездка', body: null });
  });
});

describe('NotificationsQueryDto (AC7)', () => {
  it('defaults nothing and accepts a limit up to the maximum', async () => {
    const max = await validate(
      plainToInstance(NotificationsQueryDto, { limit: '50' }),
    );
    expect(max).toHaveLength(0);

    const tooBig = await validate(
      plainToInstance(NotificationsQueryDto, {
        limit: NOTIFICATIONS_MAX_LIMIT + 1,
      }),
    );
    expect(tooBig[0]?.property).toBe('limit');

    const badCategory = await validate(
      plainToInstance(NotificationsQueryDto, { category: 'news' }),
    );
    expect(badCategory[0]?.property).toBe('category');
  });
});

describe('NotificationsService.markAllRead (AC7)', () => {
  it('marks every unread row of the current user and returns the updated count', async () => {
    const { service, marks } = setup([], { updated: 3 });
    await expect(service.markAllRead(USER)).resolves.toEqual({ updated: 3 });
    expect(marks).toHaveLength(1);
    expect(marks[0]?.userId).toBe(USER);
    expect(marks[0]?.readAt).toBeInstanceOf(Date);
  });

  it('returns 0 when nothing was unread', async () => {
    const { service } = setup([], { updated: 0 });
    await expect(service.markAllRead(USER)).resolves.toEqual({ updated: 0 });
  });
});

import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  AdminActionCode,
  BlockReason,
  UserRole,
  UserStatus,
} from './auth.constants.js';
import type { Tx } from './auth.repository.js';
import { LOCKOUT_MAX_FAILURES, LOCKOUT_WINDOW_MS } from './lockout.rules.js';

export type UserSort =
  'joined_desc' | 'joined_asc' | 'active_desc' | 'active_asc';

export interface KeysetCursor {
  at: Date;
  id: string;
}

export interface UserListFilter {
  q?: string;
  status?: UserStatus;
  role?: UserRole;
  joinedSince?: Date;
  /** Usernames locked out right now; needed to answer status filters. */
  lockedUsernames: string[];
}

const listSelect = {
  id: true,
  username: true,
  role: true,
  blockedAt: true,
  recoveryPhone: true,
  recoveryPhoneVerifiedAt: true,
  createdAt: true,
  lastActiveAt: true,
  level: true,
} satisfies Prisma.UserSelect;

export type UserListRow = Prisma.UserGetPayload<{ select: typeof listSelect }>;

const auditSelect = {
  id: true,
  action: true,
  reasonCode: true,
  note: true,
  detail: true,
  at: true,
  admin: { select: { id: true, username: true } },
} satisfies Prisma.AdminAuditLogSelect;

export type AuditRow = Prisma.AdminAuditLogGetPayload<{
  select: typeof auditSelect;
}>;

export interface NewAuditEntry {
  adminId: string;
  userId: string;
  action: AdminActionCode;
  reasonCode?: BlockReason;
  note: string;
  detail?: string;
}

export interface StatsCounts {
  total: number;
  newToday: number;
  new7d: number;
  active7d: number;
  blocked: number;
  withPhone: number;
}

export interface DayCount {
  date: string;
  count: number;
}

/** Queries behind the admin panel: aggregates, the users table and the audit log. */
@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async counts(now: Date, startOfToday: Date): Promise<StatsCounts> {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
    const [total, newToday, new7d, active7d, blocked, withPhone] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
        this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        this.prisma.user.count({
          where: { lastActiveAt: { gte: sevenDaysAgo } },
        }),
        this.prisma.user.count({ where: { blockedAt: { not: null } } }),
        this.prisma.user.count({
          where: { recoveryPhoneVerifiedAt: { not: null } },
        }),
      ]);
    return { total, newToday, new7d, active7d, blocked, withPhone };
  }

  /** Sign-ups per Asia/Tashkent calendar day for the 30 days ending today, zero-filled, oldest first. */
  signupsByDay(now: Date, since: Date): Promise<DayCount[]> {
    return this.prisma.$queryRaw<DayCount[]>`
      SELECT to_char(d.day, 'YYYY-MM-DD') AS date, count(u.id)::int AS count
      FROM generate_series(
        ((${now}::timestamptz AT TIME ZONE 'Asia/Tashkent')::date - 29)::timestamp,
        (${now}::timestamptz AT TIME ZONE 'Asia/Tashkent')::date::timestamp,
        interval '1 day'
      ) AS d(day)
      LEFT JOIN users u
        ON u.created_at >= ${since}::timestamptz
       AND (u.created_at AT TIME ZONE 'Asia/Tashkent')::date = d.day::date
      GROUP BY d.day
      ORDER BY d.day`;
  }

  /** Usernames with enough wrong passwords in the window (since their last success) to be locked now. */
  async lockedUsernames(now: Date): Promise<string[]> {
    const windowStart = new Date(now.getTime() - LOCKOUT_WINDOW_MS);
    const rows = await this.prisma.$queryRaw<{ username: string }[]>`
      SELECT a.username
      FROM login_attempts a
      WHERE a.ok = false
        AND a.at > ${windowStart}
        AND a.at > COALESCE(
          (SELECT max(s.at) FROM login_attempts s WHERE s.username = a.username AND s.ok),
          '-infinity'::timestamptz)
      GROUP BY a.username
      HAVING count(*) >= ${LOCKOUT_MAX_FAILURES}
      LIMIT 5000`;
    return rows.map((row) => row.username);
  }

  async listUsers(
    filter: UserListFilter,
    sort: UserSort,
    cursor: KeysetCursor | null,
    limit: number,
  ): Promise<{ rows: UserListRow[]; total: number }> {
    const where = this.buildWhere(filter);
    const [field, direction] = sortParts(sort);
    const keyset: Prisma.UserWhereInput[] = cursor
      ? [
          {
            OR: [
              { [field]: { [direction === 'desc' ? 'lt' : 'gt']: cursor.at } },
              {
                [field]: cursor.at,
                id: { [direction === 'desc' ? 'lt' : 'gt']: cursor.id },
              },
            ],
          },
        ]
      : [];
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { AND: [where, ...keyset] },
        orderBy: [{ [field]: direction }, { id: direction }],
        take: limit + 1,
        select: listSelect,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { rows, total };
  }

  countActiveSessions(userId: string, now: Date): Promise<number> {
    return this.prisma.refreshToken.count({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
    });
  }

  async appendAudit(entry: NewAuditEntry, tx: Tx): Promise<void> {
    await tx.adminAuditLog.create({ data: entry });
  }

  async userExists(userId: string): Promise<boolean> {
    const found = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return found !== null;
  }

  async listAudit(
    userId: string,
    cursor: KeysetCursor | null,
    limit: number,
  ): Promise<AuditRow[]> {
    return this.prisma.adminAuditLog.findMany({
      where: {
        userId,
        ...(cursor && {
          OR: [
            { at: { lt: cursor.at } },
            { at: cursor.at, id: { lt: cursor.id } },
          ],
        }),
      },
      orderBy: [{ at: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: auditSelect,
    });
  }

  private buildWhere(filter: UserListFilter): Prisma.UserWhereInput {
    const and: Prisma.UserWhereInput[] = [];
    if (filter.q) {
      // Prisma does not escape LIKE wildcards: a typed % or _ must match itself, not anything.
      and.push({
        username: {
          contains: filter.q.toLowerCase().replace(/[\\%_]/g, '\\$&'),
        },
      });
    }
    if (filter.role) and.push({ role: filter.role });
    if (filter.joinedSince) {
      and.push({ createdAt: { gte: filter.joinedSince } });
    }
    if (filter.status === 'blocked') {
      and.push({ blockedAt: { not: null } });
    } else if (filter.status === 'locked') {
      and.push({ username: { in: filter.lockedUsernames } });
    } else if (filter.status === 'active') {
      and.push({
        blockedAt: null,
        username: { notIn: filter.lockedUsernames },
      });
    }
    return { AND: and };
  }
}

function sortParts(
  sort: UserSort,
): ['createdAt' | 'lastActiveAt', 'asc' | 'desc'] {
  switch (sort) {
    case 'joined_desc':
      return ['createdAt', 'desc'];
    case 'joined_asc':
      return ['createdAt', 'asc'];
    case 'active_desc':
      return ['lastActiveAt', 'desc'];
    case 'active_asc':
      return ['lastActiveAt', 'asc'];
  }
}

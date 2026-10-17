import { Injectable } from '@nestjs/common';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import { decodeCursor, encodeCursor } from '../../lib/cursor.js';
import { minusDays, startOfTashkentDay } from '../../lib/dates.js';
import {
  AdminRepository,
  type KeysetCursor,
  type UserListRow,
  type UserSort,
} from './admin.repository.js';
import {
  type AdminActionCode,
  type BlockReason,
  type UserStatus,
} from './auth.constants.js';
import {
  AlreadyBlockedError,
  CannotBlockSelfError,
  CannotChangeOwnRoleError,
  NotBlockedError,
  PhoneInvalidError,
  UserNotFoundError,
} from './auth.errors.js';
import { AuthRepository, type Tx, type UserRecord } from './auth.repository.js';
import type {
  AdminAuditListResponseDto,
  AdminUserDetailDto,
  AdminUserListItemDto,
  AdminUserListResponseDto,
  AdminAuditQueryDto,
  AdminUsersQueryDto,
  BlockUserDto,
  SetUserPasswordDto,
  SetUserRecoveryPhoneDto,
  SetUserRoleDto,
  UnblockUserDto,
  UserStatsResponseDto,
} from './dto/admin.dto.js';
import { usernameLockout } from './lockout.rules.js';
import { PasswordService } from './password.service.js';
import { PhoneCipher } from './phone-cipher.js';
import { maskPhone, normalizePhone } from './phone.rules.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIST_DEFAULT_LIMIT = 20;
const AUDIT_DEFAULT_LIMIT = 50;
/** Admin actions that do not come from a request (set-password lifts the lock like a success). */
const ADMIN_ATTEMPT_SOURCE = 'admin-panel';

/** The admin panel's view of users and the actions on them (AC12-AC15). Every action is audited. */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly admin: AdminRepository,
    private readonly passwords: PasswordService,
    private readonly cipher: PhoneCipher,
  ) {}

  async stats(now = new Date()): Promise<UserStatsResponseDto> {
    const startOfToday = startOfTashkentDay(now);
    const [counts, signupsByDay] = await Promise.all([
      this.admin.counts(now, startOfToday),
      this.admin.signupsByDay(now, minusDays(startOfToday, 29)),
    ]);
    return {
      total: counts.total,
      newToday: counts.newToday,
      new7d: counts.new7d,
      active7d: counts.active7d,
      blocked: counts.blocked,
      withPhonePct:
        counts.total === 0
          ? 0
          : Math.round((counts.withPhone / counts.total) * 1000) / 10,
      signupsByDay,
    };
  }

  async list(
    query: AdminUsersQueryDto,
    now = new Date(),
  ): Promise<AdminUserListResponseDto> {
    const limit = query.limit ?? LIST_DEFAULT_LIMIT;
    const sort: UserSort = query.sort ?? 'joined_desc';
    const lockedUsernames = await this.admin.lockedUsernames(now);
    const { rows, total } = await this.admin.listUsers(
      {
        q: query.q?.trim() || undefined,
        status: query.status,
        role: query.role,
        joinedSince: joinedSince(query.joined, now),
        lockedUsernames,
      },
      sort,
      parseCursor(query.cursor),
      limit,
    );
    const page = rows.slice(0, limit);
    const locked = new Set(lockedUsernames);
    const last = page[page.length - 1];
    return {
      items: page.map((row) => this.toListItem(row, locked.has(row.username))),
      nextCursor:
        rows.length > limit && last
          ? encodeCursor({
              at: sortValue(last, sort).toISOString(),
              id: last.id,
            })
          : null,
      total,
    };
  }

  async detail(id: string, now = new Date()): Promise<AdminUserDetailDto> {
    const user = await this.repository.findById(id);
    if (!user) throw new UserNotFoundError();
    const [sessionsCount, failures] = await Promise.all([
      this.admin.countActiveSessions(id, now),
      this.repository.failureTimesForUsername(user.username, now),
    ]);
    const lockout = usernameLockout(failures, now);
    return {
      ...this.toListItem(user, lockout.limited),
      locale: user.locale,
      recoveryPhoneVerified: user.recoveryPhoneVerifiedAt !== null,
      blockedAt: user.blockedAt?.toISOString() ?? null,
      blockReasonCode: user.blockReasonCode,
      lockedForSec: lockout.limited ? lockout.retryAfterSec : null,
      sessionsCount,
      level: null,
    };
  }

  async block(
    adminId: string,
    id: string,
    dto: BlockUserDto,
  ): Promise<AdminUserDetailDto> {
    if (adminId === id) throw new CannotBlockSelfError();
    await this.repository.transaction(async (tx) => {
      const user = await this.repository.findById(id, tx);
      if (!user) throw new UserNotFoundError();
      if (user.blockedAt) throw new AlreadyBlockedError();
      const now = new Date();
      await this.repository.setBlocked(
        id,
        { at: now, reasonCode: dto.reasonCode },
        tx,
      );
      await this.repository.revokeAllForUser(id, now, tx);
      await this.audit(tx, adminId, id, 'block', dto.note, dto.reasonCode);
    });
    return this.detail(id);
  }

  async unblock(
    adminId: string,
    id: string,
    dto: UnblockUserDto,
  ): Promise<AdminUserDetailDto> {
    await this.repository.transaction(async (tx) => {
      const user = await this.repository.findById(id, tx);
      if (!user) throw new UserNotFoundError();
      if (!user.blockedAt) throw new NotBlockedError();
      await this.repository.setBlocked(id, null, tx);
      await this.audit(tx, adminId, id, 'unblock', dto.note, dto.reasonCode);
    });
    return this.detail(id);
  }

  async setPassword(
    adminId: string,
    id: string,
    dto: SetUserPasswordDto,
  ): Promise<void> {
    const user = await this.repository.findById(id);
    if (!user) throw new UserNotFoundError();
    this.passwords.assertAcceptable(
      dto.newPassword,
      user.username,
      'newPassword',
    );
    const passwordHash = await this.passwords.hash(dto.newPassword);
    await this.repository.transaction(async (tx) => {
      await this.repository.updatePasswordHash(id, passwordHash, tx);
      await this.repository.revokeAllForUser(id, new Date(), tx);
      await this.repository.recordAttempt(
        user.username,
        ADMIN_ATTEMPT_SOURCE,
        true,
        tx,
      );
      await this.audit(tx, adminId, id, 'set_password', dto.note);
    });
  }

  async setRecoveryPhone(
    adminId: string,
    id: string,
    dto: SetUserRecoveryPhoneDto,
  ): Promise<AdminUserDetailDto> {
    const phone = normalizePhone(dto.phone);
    if (!phone) throw new PhoneInvalidError();
    const encrypted = this.cipher.encrypt(phone);
    await this.repository.transaction(async (tx) => {
      if (!(await this.repository.findById(id, tx))) {
        throw new UserNotFoundError();
      }
      await this.repository.setRecoveryPhone(id, encrypted, new Date(), tx);
      await this.audit(tx, adminId, id, 'set_recovery_phone', dto.note);
    });
    return this.detail(id);
  }

  async setRole(
    adminId: string,
    id: string,
    dto: SetUserRoleDto,
  ): Promise<AdminUserDetailDto> {
    if (adminId === id) throw new CannotChangeOwnRoleError();
    await this.repository.transaction(async (tx) => {
      const user = await this.repository.findById(id, tx);
      if (!user) throw new UserNotFoundError();
      if (user.role === dto.role) return;
      await this.repository.setRole(id, dto.role, tx);
      await this.audit(
        tx,
        adminId,
        id,
        'change_role',
        dto.note,
        undefined,
        `role: ${user.role} -> ${dto.role}`,
      );
    });
    return this.detail(id);
  }

  async listAudit(
    id: string,
    query: AdminAuditQueryDto,
  ): Promise<AdminAuditListResponseDto> {
    if (!(await this.admin.userExists(id))) throw new UserNotFoundError();
    const limit = query.limit ?? AUDIT_DEFAULT_LIMIT;
    const rows = await this.admin.listAudit(
      id,
      parseCursor(query.cursor),
      limit,
    );
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map((row) => ({
        id: row.id,
        admin: row.admin,
        action: row.action,
        reasonCode: row.reasonCode,
        note: row.note,
        detail: row.detail,
        at: row.at.toISOString(),
      })),
      nextCursor:
        rows.length > limit && last
          ? encodeCursor({ at: last.at.toISOString(), id: last.id })
          : null,
    };
  }

  private audit(
    tx: Tx,
    adminId: string,
    userId: string,
    action: AdminActionCode,
    note: string,
    reasonCode?: BlockReason,
    detail?: string,
  ): Promise<void> {
    return this.admin.appendAudit(
      { adminId, userId, action, note, reasonCode, detail },
      tx,
    );
  }

  private toListItem(
    user: UserListRow | UserRecord,
    locked: boolean,
  ): AdminUserListItemDto {
    const status: UserStatus = user.blockedAt
      ? 'blocked'
      : locked
        ? 'locked'
        : 'active';
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      status,
      joinedAt: user.createdAt.toISOString(),
      lastActiveAt: user.lastActiveAt.toISOString(),
      recoveryPhoneMasked: user.recoveryPhone
        ? maskPhone(this.cipher.decrypt(user.recoveryPhone))
        : null,
    };
  }
}

function joinedSince(
  joined: AdminUsersQueryDto['joined'],
  now: Date,
): Date | undefined {
  if (joined === 'today') return startOfTashkentDay(now);
  if (joined === '7d') return minusDays(now, 7);
  if (joined === '30d') return minusDays(now, 30);
  return undefined;
}

function sortValue(row: UserListRow, sort: UserSort): Date {
  return sort.startsWith('joined') ? row.createdAt : row.lastActiveAt;
}

function parseCursor(raw: string | undefined): KeysetCursor | null {
  if (!raw) return null;
  const payload = decodeCursor(raw);
  const at = typeof payload?.at === 'string' ? new Date(payload.at) : null;
  if (
    !payload ||
    !at ||
    Number.isNaN(at.getTime()) ||
    typeof payload.id !== 'string' ||
    !UUID.test(payload.id)
  ) {
    throw new RequestValidationError({ cursor: ['invalid'] });
  }
  return { at, id: payload.id };
}

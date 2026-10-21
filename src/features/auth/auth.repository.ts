import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsernameTakenError } from './auth.errors.js';
import type {
  BlockReason,
  ExperienceCode,
  InterestCode,
  LocaleCode,
  SmsPurposeCode,
  UserRole,
} from './auth.constants.js';
import { LOCKOUT_WINDOW_MS } from './lockout.rules.js';

/** Handle of an open database transaction; opaque to services. */
export type Tx = Prisma.TransactionClient;

const userSelect = {
  id: true,
  username: true,
  passwordHash: true,
  recoveryPhone: true,
  recoveryPhoneVerifiedAt: true,
  locale: true,
  experience: true,
  interests: true,
  role: true,
  blockedAt: true,
  blockReasonCode: true,
  createdAt: true,
  lastActiveAt: true,
  level: true,
  xpTotal: true,
  displayName: true,
  bio: true,
  homeRegion: true,
  avatarKey: true,
  showStats: true,
  showHomeRegion: true,
  units: true,
  appearance: true,
  notifyStreak: true,
  notifyDailyGame: true,
  dailyGameTime: true,
  notifyGroups: true,
  notifySocial: true,
  notifyOffers: true,
  publicProfile: true,
  findBuddies: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

export type UserRecord = Prisma.UserGetPayload<{ select: typeof userSelect }>;

const refreshSelect = {
  id: true,
  userId: true,
  familyId: true,
  expiresAt: true,
  revokedAt: true,
  replacedById: true,
  user: {
    select: { id: true, role: true, blockedAt: true, blockReasonCode: true },
  },
} satisfies Prisma.RefreshTokenSelect;

export type RefreshRecord = Prisma.RefreshTokenGetPayload<{
  select: typeof refreshSelect;
}>;

const codeSelect = {
  id: true,
  userId: true,
  purpose: true,
  phone: true,
  codeHash: true,
  expiresAt: true,
  attempts: true,
  usedAt: true,
  createdAt: true,
} satisfies Prisma.SmsCodeSelect;

export type SmsCodeRecord = Prisma.SmsCodeGetPayload<{
  select: typeof codeSelect;
}>;

export interface NewUser {
  username: string;
  passwordHash: string;
  locale: LocaleCode;
  termsAcceptedAt: Date;
}

export interface NewRefreshToken {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface NewSmsCode {
  userId: string;
  purpose: SmsPurposeCode;
  phone: string;
  codeHash: string;
  expiresAt: Date;
}

class RotationLost extends Error {}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/** Everything the auth feature stores about accounts, sessions, attempts and SMS codes. */
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  // --- users ---

  async createUser(data: NewUser): Promise<UserRecord> {
    try {
      return await this.prisma.user.create({ data, select: userSelect });
    } catch (error) {
      if (isUniqueViolation(error)) throw new UsernameTakenError();
      throw error;
    }
  }

  findByUsername(username: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: { username },
      select: userSelect,
    });
  }

  findById(id: string, tx?: Tx): Promise<UserRecord | null> {
    return (tx ?? this.prisma).user.findUnique({
      where: { id },
      select: userSelect,
    });
  }

  async usernameExists(username: string): Promise<boolean> {
    const found = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    return found !== null;
  }

  /** Writes `last_active_at` only when the stored value is older than `olderThan` (once per hour). */
  async touchLastActive(id: string, now: Date, olderThan: Date): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id, lastActiveAt: { lt: olderThan } },
      data: { lastActiveAt: now },
    });
  }

  async updatePasswordHash(
    id: string,
    passwordHash: string,
    tx?: Tx,
  ): Promise<void> {
    await (tx ?? this.prisma).user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  /** Writes each onboarding field only where the account's value is still empty (one transaction). */
  async fillEmptyOnboarding(
    id: string,
    data: { experience?: ExperienceCode; interests?: InterestCode[] },
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (data.experience !== undefined) {
        await tx.user.updateMany({
          where: { id, experience: null },
          data: { experience: data.experience },
        });
      }
      if (data.interests !== undefined && data.interests.length > 0) {
        await tx.user.updateMany({
          where: { id, interests: { isEmpty: true } },
          data: { interests: data.interests },
        });
      }
    });
  }

  async setRecoveryPhone(
    id: string,
    encryptedPhone: string,
    verifiedAt: Date,
    tx?: Tx,
  ): Promise<void> {
    await (tx ?? this.prisma).user.update({
      where: { id },
      data: {
        recoveryPhone: encryptedPhone,
        recoveryPhoneVerifiedAt: verifiedAt,
      },
    });
  }

  async setRole(id: string, role: UserRole, tx?: Tx): Promise<void> {
    await (tx ?? this.prisma).user.update({ where: { id }, data: { role } });
  }

  /** Writes the already-normalized username; a concurrent claim answers USERNAME_TAKEN. */
  async updateUsername(id: string, username: string, tx?: Tx): Promise<void> {
    try {
      await (tx ?? this.prisma).user.update({
        where: { id },
        data: { username },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new UsernameTakenError();
      throw error;
    }
  }

  async setBlocked(
    id: string,
    block: { at: Date; reasonCode: BlockReason } | null,
    tx?: Tx,
  ): Promise<void> {
    await (tx ?? this.prisma).user.update({
      where: { id },
      data: {
        blockedAt: block?.at ?? null,
        blockReasonCode: block?.reasonCode ?? null,
      },
    });
  }

  // --- log-in attempts ---

  async recordAttempt(
    username: string,
    ip: string,
    ok: boolean,
    tx?: Tx,
  ): Promise<void> {
    await (tx ?? this.prisma).loginAttempt.create({
      data: { username, ip, ok },
    });
  }

  /** Wrong-password times for a username inside the lockout window and after its last success. */
  async failureTimesForUsername(username: string, now: Date): Promise<Date[]> {
    const windowStart = new Date(now.getTime() - LOCKOUT_WINDOW_MS);
    const lastSuccess = await this.prisma.loginAttempt.findFirst({
      where: { username, ok: true, at: { gt: windowStart } },
      orderBy: { at: 'desc' },
      select: { at: true },
    });
    const rows = await this.prisma.loginAttempt.findMany({
      where: {
        username,
        ok: false,
        at: { gt: lastSuccess?.at ?? windowStart },
      },
      select: { at: true },
    });
    return rows.map((row) => row.at);
  }

  async failureTimesForIp(ip: string, now: Date): Promise<Date[]> {
    const rows = await this.prisma.loginAttempt.findMany({
      where: {
        ip,
        ok: false,
        at: { gt: new Date(now.getTime() - LOCKOUT_WINDOW_MS) },
      },
      select: { at: true },
    });
    return rows.map((row) => row.at);
  }

  // --- refresh tokens ---

  async createRefreshToken(data: NewRefreshToken, tx?: Tx): Promise<void> {
    await (tx ?? this.prisma).refreshToken.create({ data });
  }

  findRefreshByHash(tokenHash: string): Promise<RefreshRecord | null> {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: refreshSelect,
    });
  }

  /**
   * Exchanges `current` for a new token atomically. False means another request already
   * rotated `current` (a replay), and nothing was written.
   */
  async rotateRefreshToken(
    current: { id: string; userId: string; familyId: string },
    next: { tokenHash: string; expiresAt: Date },
    now: Date,
  ): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const created = await tx.refreshToken.create({
          data: {
            userId: current.userId,
            familyId: current.familyId,
            tokenHash: next.tokenHash,
            expiresAt: next.expiresAt,
          },
          select: { id: true },
        });
        const claimed = await tx.refreshToken.updateMany({
          where: { id: current.id, revokedAt: null },
          data: { revokedAt: now, replacedById: created.id },
        });
        if (claimed.count !== 1) throw new RotationLost();
      });
      return true;
    } catch (error) {
      if (error instanceof RotationLost) return false;
      throw error;
    }
  }

  async revokeFamily(familyId: string, now: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async revokeAllForUser(userId: string, now: Date, tx?: Tx): Promise<void> {
    await (tx ?? this.prisma).refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  /** Ends every session except one refresh-token family (the caller's, when it has one). */
  async revokeAllForUserExceptFamily(
    userId: string,
    keepFamilyId: string | null,
    now: Date,
    tx?: Tx,
  ): Promise<void> {
    await (tx ?? this.prisma).refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(keepFamilyId ? { familyId: { not: keepFamilyId } } : {}),
      },
      data: { revokedAt: now },
    });
  }

  countActiveSessions(userId: string, now: Date): Promise<number> {
    return this.prisma.refreshToken.count({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
    });
  }

  // --- SMS codes ---

  newestCode(
    userId: string,
    purpose: SmsPurposeCode,
    tx?: Tx,
  ): Promise<SmsCodeRecord | null> {
    return (tx ?? this.prisma).smsCode.findFirst({
      where: { userId, purpose },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: codeSelect,
    });
  }

  countCodesSince(
    userId: string,
    purpose: SmsPurposeCode,
    since: Date,
  ): Promise<number> {
    return this.prisma.smsCode.count({
      where: { userId, purpose, createdAt: { gt: since } },
    });
  }

  /** Stores a new code and voids the older unused ones of the same purpose. */
  async createCode(data: NewSmsCode, now: Date): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.smsCode.updateMany({
        where: { userId: data.userId, purpose: data.purpose, usedAt: null },
        data: { usedAt: now },
      });
      await tx.smsCode.create({ data });
    });
  }

  /** Counts a wrong try; false when the code already used up its tries (concurrent guesses). */
  async addCodeAttempt(id: string, maxAttempts: number): Promise<boolean> {
    const counted = await this.prisma.smsCode.updateMany({
      where: { id, usedAt: null, attempts: { lt: maxAttempts } },
      data: { attempts: { increment: 1 } },
    });
    return counted.count === 1;
  }

  /** Marks a code used if it is still unused, unexpired and under the try limit. */
  async consumeCode(
    id: string,
    now: Date,
    maxAttempts: number,
    tx: Tx,
  ): Promise<boolean> {
    const claimed = await tx.smsCode.updateMany({
      where: {
        id,
        usedAt: null,
        attempts: { lt: maxAttempts },
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });
    return claimed.count === 1;
  }

  async hasPendingPhoneCode(userId: string, now: Date): Promise<boolean> {
    const count = await this.prisma.smsCode.count({
      where: {
        userId,
        purpose: 'phone_verify',
        usedAt: null,
        expiresAt: { gt: now },
      },
    });
    return count > 0;
  }
}

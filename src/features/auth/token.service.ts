import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '../../config/app-config.js';
import { addMs } from '../../lib/dates.js';
import {
  AccountBlockedError,
  RefreshInvalidError,
  RefreshReusedError,
} from './auth.errors.js';
import { AuthRepository, type Tx } from './auth.repository.js';
import type { UserRole } from './auth.constants.js';
import { classifyRefresh } from './refresh.rules.js';

const DAY_MS = 86_400_000;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Access JWTs and rotating, hashed, family-tracked refresh tokens (ADR-001, AC9). */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
    private readonly repository: AuthRepository,
  ) {}

  get accessTtlSec(): number {
    return this.config.jwtAccessTtlSec;
  }

  get refreshTtlMs(): number {
    return this.config.refreshTtlDays * DAY_MS;
  }

  signAccess(user: { id: string; role: UserRole }): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, role: user.role },
      {
        secret: this.config.jwtAccessSecret,
        algorithm: 'HS256',
        expiresIn: this.config.jwtAccessTtlSec,
      },
    );
  }

  /** A new log-in: a new refresh-token family. */
  async startSession(
    user: { id: string; role: UserRole },
    now = new Date(),
    tx?: Tx,
  ): Promise<IssuedTokens> {
    const refreshToken = newRefreshToken();
    await this.repository.createRefreshToken(
      {
        userId: user.id,
        familyId: randomUUID(),
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: addMs(now, this.refreshTtlMs),
      },
      tx,
    );
    return {
      accessToken: await this.signAccess(user),
      refreshToken,
      expiresIn: this.config.jwtAccessTtlSec,
    };
  }

  /**
   * Exchanges a refresh token for a new pair. Replaying an already-rotated token revokes its
   * whole family; a blocked user's refresh is refused and ends all their sessions.
   */
  async refresh(
    rawToken: string,
    options: { requireAdmin: boolean },
    now = new Date(),
  ): Promise<IssuedTokens> {
    const record = await this.repository.findRefreshByHash(
      hashRefreshToken(rawToken),
    );
    // A blocked user always learns why, even when the block already revoked their tokens.
    if (record?.user.blockedAt) {
      await this.repository.revokeAllForUser(record.user.id, now);
      throw new AccountBlockedError(record.user.blockReasonCode ?? 'other');
    }
    const verdict = classifyRefresh(record, now);
    if (!record || verdict === 'invalid') throw new RefreshInvalidError();
    if (verdict === 'reused') {
      await this.repository.revokeFamily(record.familyId, now);
      throw new RefreshReusedError();
    }

    const { user } = record;
    if (options.requireAdmin && user.role !== 'admin') {
      await this.repository.revokeFamily(record.familyId, now);
      throw new RefreshInvalidError();
    }

    const refreshToken = newRefreshToken();
    const rotated = await this.repository.rotateRefreshToken(
      record,
      {
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: addMs(now, this.refreshTtlMs),
      },
      now,
    );
    if (!rotated) {
      await this.repository.revokeFamily(record.familyId, now);
      throw new RefreshReusedError();
    }
    return {
      accessToken: await this.signAccess(user),
      refreshToken,
      expiresIn: this.config.jwtAccessTtlSec,
    };
  }

  /** Ends the family of a refresh token. Returns false when the token is unknown or not the caller's. */
  async revoke(
    rawToken: string,
    onlyForUserId?: string,
    now = new Date(),
  ): Promise<boolean> {
    const record = await this.repository.findRefreshByHash(
      hashRefreshToken(rawToken),
    );
    if (!record || (onlyForUserId && record.userId !== onlyForUserId)) {
      return false;
    }
    await this.repository.revokeFamily(record.familyId, now);
    return true;
  }
}

function newRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

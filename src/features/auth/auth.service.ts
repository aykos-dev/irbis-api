import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RateLimitedError } from '../../common/errors/domain.error.js';
import { addMs } from '../../lib/dates.js';
import {
  LAST_ACTIVE_MIN_INTERVAL_MS,
  type UserRole,
} from './auth.constants.js';
import {
  AccountBlockedError,
  AccountLockedError,
  InvalidCredentialsError,
  NotAdminError,
  PhoneInvalidError,
  RefreshInvalidError,
  TermsRequiredError,
  UsernameInvalidError,
  UsernameReservedError,
} from './auth.errors.js';
import { AuthRepository, type UserRecord } from './auth.repository.js';
import type { LogInDto, SignUpDto } from './dto/auth.request.dto.js';
import type {
  AuthSessionResponseDto,
  TokensResponseDto,
  UsernameAvailabilityResponseDto,
} from './dto/session.response.dto.js';
import type { MeResponseDto } from './dto/me.response.dto.js';
import { MeService } from './me.service.js';
import {
  ipThrottle,
  usernameLockout,
  type LimitState,
} from './lockout.rules.js';
import { PasswordService } from './password.service.js';
import { normalizePhone } from './phone.rules.js';
import { RecoveryService } from './recovery.service.js';
import { TokenService } from './token.service.js';
import { normalizeUsername, usernameProblem } from './username.rules.js';

export interface AdminLogInResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  me: MeResponseDto;
}

/** Sign-up, log-in with lockout, refresh, sign-out and the per-request account check. */
@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly recovery: RecoveryService,
    private readonly me: MeService,
  ) {}

  async signUp(dto: SignUpDto): Promise<AuthSessionResponseDto> {
    if (!dto.acceptTerms) throw new TermsRequiredError();
    const username = normalizeUsername(dto.username);
    this.assertUsernameUsable(username);
    const phone = dto.recoveryPhone ? normalizePhone(dto.recoveryPhone) : null;
    if (dto.recoveryPhone && !phone) throw new PhoneInvalidError();
    this.passwords.assertAcceptable(dto.password, username);

    const now = new Date();
    const user = await this.repository.createUser({
      username,
      passwordHash: await this.passwords.hash(dto.password),
      locale: dto.locale,
      termsAcceptedAt: now,
    });
    if (phone) await this.recovery.startPhoneVerification(user.id, phone, now);

    const session = await this.tokens.startSession(user, now);
    return { ...session, me: await this.me.toMe(user, now) };
  }

  async usernameAvailability(
    raw: string,
  ): Promise<UsernameAvailabilityResponseDto> {
    const username = normalizeUsername(raw);
    const problem = usernameProblem(username);
    if (problem === 'reserved') return { available: false, reason: 'reserved' };
    if (problem) return { available: false, reason: 'invalid' };
    return (await this.repository.usernameExists(username))
      ? { available: false, reason: 'taken' }
      : { available: true };
  }

  async logIn(
    dto: LogInDto,
    ip: string,
    options: { requireAdmin: boolean },
  ): Promise<AdminLogInResult> {
    const user = await this.authenticate(dto, ip);
    if (options.requireAdmin && user.role !== 'admin') {
      throw new NotAdminError();
    }
    const now = new Date();
    await this.touchLastActive(user.id, now);
    const session = await this.tokens.startSession(user, now);
    return { ...session, me: await this.me.toMe(user, now) };
  }

  refresh(refreshToken: string): Promise<TokensResponseDto> {
    return this.tokens.refresh(refreshToken, { requireAdmin: false });
  }

  async signOut(userId: string, refreshToken: string): Promise<void> {
    await this.tokens.revoke(refreshToken, userId);
  }

  refreshAdmin(refreshToken: string): Promise<TokensResponseDto> {
    return this.tokens.refresh(refreshToken, { requireAdmin: true });
  }

  async signOutAdmin(refreshToken: string): Promise<void> {
    if (!(await this.tokens.revoke(refreshToken))) {
      throw new RefreshInvalidError();
    }
  }

  /**
   * Per-request check for authenticated routes: the account must exist and not be blocked.
   * Returns the current role (so promotions and demotions apply at once) and keeps
   * `last_active_at` fresh to the hour.
   */
  async checkSession(userId: string): Promise<{ role: UserRole }> {
    const user = await this.repository.findById(userId);
    if (!user) throw new UnauthorizedException();
    if (user.blockedAt) {
      throw new AccountBlockedError(user.blockReasonCode ?? 'other');
    }
    await this.touchLastActive(user.id, new Date());
    return { role: user.role };
  }

  private touchLastActive(userId: string, now: Date): Promise<void> {
    return this.repository.touchLastActive(
      userId,
      now,
      addMs(now, -LAST_ACTIVE_MIN_INTERVAL_MS),
    );
  }

  private assertUsernameUsable(username: string): void {
    const problem = usernameProblem(username);
    if (problem === 'reserved') throw new UsernameReservedError();
    if (problem) throw new UsernameInvalidError(problem);
  }

  /** Verifies credentials under the lockout and IP rules; returns the user on success. */
  private async authenticate(dto: LogInDto, ip: string): Promise<UserRecord> {
    const username = normalizeUsername(dto.username);
    const now = new Date();

    const ipState = ipThrottle(
      await this.repository.failureTimesForIp(ip, now),
      now,
    );
    if (ipState.limited) {
      throw new RateLimitedError(
        'Too many failed log-ins from this address',
        ipState.retryAfterSec,
      );
    }
    const failures = await this.repository.failureTimesForUsername(
      username,
      now,
    );
    this.assertNotLocked(usernameLockout(failures, now));

    const user = await this.repository.findByUsername(username);
    let valid = false;
    if (user) {
      valid = await this.passwords.verify(user.passwordHash, dto.password);
    } else {
      await this.passwords.verifyAgainstDummy(dto.password);
    }

    if (!user || !valid) {
      const failedAt = new Date();
      await this.repository.recordAttempt(username, ip, false);
      this.assertNotLocked(usernameLockout([...failures, failedAt], failedAt));
      throw new InvalidCredentialsError();
    }

    await this.repository.recordAttempt(username, ip, true);
    if (user.blockedAt) {
      throw new AccountBlockedError(user.blockReasonCode ?? 'other');
    }
    return user;
  }

  private assertNotLocked(state: LimitState): void {
    if (state.limited) throw new AccountLockedError(state.retryAfterSec);
  }
}

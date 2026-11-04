import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../config/app-config.js';
import { RateLimitedError } from '../../common/errors/domain.error.js';
import { addMs } from '../../lib/dates.js';
import type { SmsPurposeCode } from './auth.constants.js';
import {
  AccountBlockedError,
  CodeAttemptsError,
  CodeExpiredError,
  CodeInvalidError,
  PhoneInvalidError,
} from './auth.errors.js';
import { AuthRepository, type SmsCodeRecord } from './auth.repository.js';
import {
  CODE_DAY_MS,
  CODE_MAX_ATTEMPTS,
  CODE_RESEND_SEC,
  CODE_TTL_MS,
  checkCode,
  codeMatches,
  generateCode,
  hashCode,
  sendDecision,
} from './code.rules.js';
import type { ResetPasswordDto } from './dto/auth.request.dto.js';
import type {
  AuthSessionResponseDto,
  CodeSentResponseDto,
} from './dto/session.response.dto.js';
import type { MeResponseDto } from './dto/me.response.dto.js';
import { MeService } from './me.service.js';
import { PasswordService } from './password.service.js';
import { PhoneCipher } from './phone-cipher.js';
import { normalizePhone } from './phone.rules.js';
import { SmsSender } from './sms-sender.js';
import { TokenService } from './token.service.js';
import { normalizeUsername } from './username.rules.js';

type SendOutcome = 'sent' | 'cooldown' | 'daily_limit';

/** SMS codes: password reset (AC5) and recovery-phone verification (AC6). */
@Injectable()
export class RecoveryService {
  private readonly logger = new Logger(RecoveryService.name);

  constructor(
    private readonly repository: AuthRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly cipher: PhoneCipher,
    private readonly sms: SmsSender,
    private readonly me: MeService,
    private readonly config: AppConfig,
  ) {}

  /**
   * Always the same answer: whether the username exists, has a verified phone, is blocked, or
   * is inside its resend/daily limit must not be visible to the caller.
   */
  async forgotPassword(rawUsername: string): Promise<CodeSentResponseDto> {
    const user = await this.repository.findByUsername(
      normalizeUsername(rawUsername),
    );
    if (
      user &&
      user.passwordHash !== null &&
      !user.blockedAt &&
      user.recoveryPhone &&
      user.recoveryPhoneVerifiedAt
    ) {
      await this.sendCode(
        user.id,
        'password_reset',
        this.cipher.decrypt(user.recoveryPhone),
        new Date(),
      );
    }
    return { resendAfterSec: CODE_RESEND_SEC };
  }

  async resetPassword(
    dto: ResetPasswordDto,
    ip: string,
  ): Promise<AuthSessionResponseDto> {
    const username = normalizeUsername(dto.username);
    this.passwords.assertAcceptable(dto.newPassword, username, 'newPassword');

    const user = await this.repository.findByUsername(username);
    // A demo account has no password to reset: answered like an unknown username.
    if (!user || user.passwordHash === null) throw new CodeInvalidError();
    if (user.blockedAt) {
      throw new AccountBlockedError(user.blockReasonCode ?? 'other');
    }
    const code = await this.checkSubmittedCode(
      user.id,
      'password_reset',
      dto.code,
    );

    const passwordHash = await this.passwords.hash(dto.newPassword);
    const now = new Date();
    await this.repository.transaction(async (tx) => {
      if (
        !(await this.repository.consumeCode(
          code.id,
          now,
          CODE_MAX_ATTEMPTS,
          tx,
        ))
      ) {
        throw new CodeInvalidError();
      }
      await this.repository.updatePasswordHash(user.id, passwordHash, tx);
      await this.repository.revokeAllForUser(user.id, now, tx);
      // A reset also lifts any lockout: count it as a successful log-in.
      await this.repository.recordAttempt(username, ip, true, tx);
    });

    const session = await this.tokens.startSession(user, now);
    return { ...session, me: await this.me.toMe(user, now) };
  }

  /** PUT /me/recovery-phone: sends a code to the new phone; the old verified phone stays until verified. */
  async addRecoveryPhone(
    userId: string,
    rawPhone: string,
  ): Promise<CodeSentResponseDto> {
    const phone = normalizePhone(rawPhone);
    if (!phone) throw new PhoneInvalidError();
    const outcome = await this.sendCode(
      userId,
      'phone_verify',
      phone,
      new Date(),
    );
    if (outcome !== 'sent') {
      throw new RateLimitedError(
        outcome === 'cooldown'
          ? 'Wait before requesting another code'
          : 'Daily code limit reached',
        outcome === 'cooldown' ? CODE_RESEND_SEC : CODE_DAY_MS / 1000,
      );
    }
    return { resendAfterSec: CODE_RESEND_SEC };
  }

  /** Sign-up with a phone: same flow as adding one, but a failed send must not undo the account. */
  async startPhoneVerification(
    userId: string,
    phone: string,
    now: Date,
  ): Promise<void> {
    await this.sendCode(userId, 'phone_verify', phone, now);
  }

  async verifyRecoveryPhone(
    userId: string,
    code: string,
  ): Promise<MeResponseDto> {
    const record = await this.checkSubmittedCode(userId, 'phone_verify', code);
    const now = new Date();
    await this.repository.transaction(async (tx) => {
      if (
        !(await this.repository.consumeCode(
          record.id,
          now,
          CODE_MAX_ATTEMPTS,
          tx,
        ))
      ) {
        throw new CodeInvalidError();
      }
      // The code row already holds the phone encrypted; it moves to the user as is.
      await this.repository.setRecoveryPhone(userId, record.phone, now, tx);
    });
    return this.me.getMe(userId);
  }

  private async sendCode(
    userId: string,
    purpose: SmsPurposeCode,
    phone: string,
    now: Date,
  ): Promise<SendOutcome> {
    const newest = await this.repository.newestCode(userId, purpose);
    const sentToday = await this.repository.countCodesSince(
      userId,
      purpose,
      addMs(now, -CODE_DAY_MS),
    );
    const decision = sendDecision(newest?.createdAt ?? null, sentToday, now);
    if (decision !== 'send') return decision;

    const code = generateCode();
    await this.repository.createCode(
      {
        userId,
        purpose,
        phone: this.cipher.encrypt(phone),
        codeHash: this.hash(userId, purpose, code),
        expiresAt: addMs(now, CODE_TTL_MS),
      },
      now,
    );
    // A provider outage must not tell the caller which usernames have phones: log and carry on.
    await this.sms
      .send({ userId, phone, code, purpose })
      .catch((error: unknown) => {
        this.logger.error(
          { err: error, userId },
          'Sending the SMS code failed',
        );
      });
    return 'sent';
  }

  /** Checks a submitted code against the newest one; returns it only when it is valid. */
  private async checkSubmittedCode(
    userId: string,
    purpose: SmsPurposeCode,
    submitted: string,
  ): Promise<SmsCodeRecord> {
    const record = await this.repository.newestCode(userId, purpose);
    if (!record) throw new CodeInvalidError();

    const matches = codeMatches(
      record.codeHash,
      this.hash(userId, purpose, submitted),
    );
    const check = checkCode(record, matches, new Date());
    let verdict = check.verdict;
    if (check.countAttempt) {
      const counted = await this.repository.addCodeAttempt(
        record.id,
        CODE_MAX_ATTEMPTS,
      );
      if (!counted) verdict = 'attempts';
    }
    switch (verdict) {
      case 'ok':
        return record;
      case 'expired':
        throw new CodeExpiredError();
      case 'attempts':
        throw new CodeAttemptsError();
      case 'invalid':
        throw new CodeInvalidError();
    }
  }

  private hash(userId: string, purpose: SmsPurposeCode, code: string): string {
    return hashCode(this.config.jwtAccessSecret, userId, purpose, code);
  }
}

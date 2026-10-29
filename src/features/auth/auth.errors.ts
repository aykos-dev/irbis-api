import { HttpStatus } from '@nestjs/common';
import {
  DomainError,
  NotFoundError,
} from '../../common/errors/domain.error.js';
import type { UsernameProblem } from './username.rules.js';
import type { PasswordProblem } from './password.rules.js';

export class UsernameTakenError extends DomainError {
  readonly code = 'USERNAME_TAKEN';
  readonly status = HttpStatus.CONFLICT;
  override readonly fieldErrors = { username: ['taken'] };

  constructor() {
    super('Username is already taken');
  }
}

export class UsernameInvalidError extends DomainError {
  readonly code = 'USERNAME_INVALID';
  readonly status = HttpStatus.BAD_REQUEST;

  override readonly fieldErrors: Record<string, string[]>;

  constructor(readonly problem: Exclude<UsernameProblem, 'reserved'>) {
    super('Username is not valid');
    this.fieldErrors = { username: [problem] };
  }
}

export class UsernameReservedError extends DomainError {
  readonly code = 'USERNAME_RESERVED';
  readonly status = HttpStatus.BAD_REQUEST;
  override readonly fieldErrors = { username: ['reserved'] };

  constructor() {
    super('Username is reserved');
  }
}

export class PasswordWeakError extends DomainError {
  readonly code = 'PASSWORD_WEAK';
  readonly status = HttpStatus.BAD_REQUEST;

  override readonly fieldErrors: Record<string, string[]>;

  constructor(
    readonly problem: PasswordProblem,
    field = 'password',
  ) {
    super('Password does not meet the policy');
    this.fieldErrors = { [field]: [problem] };
  }
}

export class TermsRequiredError extends DomainError {
  readonly code = 'TERMS_REQUIRED';
  readonly status = HttpStatus.BAD_REQUEST;
  override readonly fieldErrors = { acceptTerms: ['required'] };

  constructor() {
    super('The terms must be accepted');
  }
}

export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';
  readonly status = HttpStatus.UNAUTHORIZED;

  constructor() {
    super('Username or password is wrong');
  }
}

export class AccountLockedError extends DomainError {
  readonly code = 'ACCOUNT_LOCKED';
  readonly status = HttpStatus.LOCKED;

  constructor(override readonly retryAfterSec: number) {
    super('Too many wrong passwords; try again later');
  }
}

export class AccountBlockedError extends DomainError {
  readonly code = 'ACCOUNT_BLOCKED';
  readonly status = HttpStatus.FORBIDDEN;

  constructor(override readonly reasonCode: string) {
    super('This account is blocked');
  }
}

export class NotAdminError extends DomainError {
  readonly code = 'NOT_ADMIN';
  readonly status = HttpStatus.FORBIDDEN;

  constructor() {
    super('This account has no admin access');
  }
}

export class RefreshInvalidError extends DomainError {
  readonly code = 'REFRESH_INVALID';
  readonly status = HttpStatus.UNAUTHORIZED;

  constructor() {
    super('Refresh token is invalid or expired');
  }
}

export class RefreshReusedError extends DomainError {
  readonly code = 'REFRESH_REUSED';
  readonly status = HttpStatus.UNAUTHORIZED;

  constructor() {
    super('Refresh token was already used; all sessions of this login ended');
  }
}

export class CodeInvalidError extends DomainError {
  readonly code = 'CODE_INVALID';
  readonly status = HttpStatus.BAD_REQUEST;

  constructor() {
    super('The code is wrong');
  }
}

export class CodeExpiredError extends DomainError {
  readonly code = 'CODE_EXPIRED';
  readonly status = HttpStatus.BAD_REQUEST;

  constructor() {
    super('The code has expired');
  }
}

export class CodeAttemptsError extends DomainError {
  readonly code = 'CODE_ATTEMPTS';
  readonly status = HttpStatus.TOO_MANY_REQUESTS;

  constructor() {
    super('Too many wrong tries; request a new code');
  }
}

export class PhoneInvalidError extends DomainError {
  readonly code = 'PHONE_INVALID';
  readonly status = HttpStatus.BAD_REQUEST;
  override readonly fieldErrors = { phone: ['invalid'] };

  constructor() {
    super('Phone must be +998 followed by 9 digits');
  }
}

export class AlreadyBlockedError extends DomainError {
  readonly code = 'ALREADY_BLOCKED';
  readonly status = HttpStatus.CONFLICT;

  constructor() {
    super('The user is already blocked');
  }
}

export class CannotBlockSelfError extends DomainError {
  readonly code = 'CANNOT_BLOCK_SELF';
  readonly status = HttpStatus.FORBIDDEN;

  constructor() {
    super('An admin cannot block themselves');
  }
}

export class NotBlockedError extends DomainError {
  readonly code = 'NOT_BLOCKED';
  readonly status = HttpStatus.CONFLICT;

  constructor() {
    super('The user is not blocked');
  }
}

export class CannotChangeOwnRoleError extends DomainError {
  readonly code = 'CANNOT_CHANGE_OWN_ROLE';
  readonly status = HttpStatus.FORBIDDEN;

  constructor() {
    super('An admin cannot change their own role');
  }
}

export class DemoLimitError extends DomainError {
  readonly code = 'DEMO_LIMIT';
  readonly status = HttpStatus.TOO_MANY_REQUESTS;

  constructor(override readonly retryAfterSec: number) {
    super('Too many demo accounts from this address today');
  }
}

export class NotDemoError extends DomainError {
  readonly code = 'NOT_DEMO';
  readonly status = HttpStatus.CONFLICT;

  constructor() {
    super('This account is already secured');
  }
}

export class UserNotFoundError extends NotFoundError {
  constructor() {
    super('User not found');
  }
}

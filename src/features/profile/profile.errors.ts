import { HttpStatus } from '@nestjs/common';
import {
  DomainError,
  NotFoundError,
} from '../../common/errors/domain.error.js';

/** Missing, deleted, blocked and private profiles all answer the same 404 (no leak). */
export class ProfileNotFoundError extends NotFoundError {
  override readonly code = 'PROFILE_NOT_FOUND';

  constructor() {
    super('Profile not found');
  }
}

/** The username change was confirmed with a wrong current password. */
export class InvalidPasswordError extends DomainError {
  readonly code = 'INVALID_PASSWORD';
  readonly status = HttpStatus.UNAUTHORIZED;

  constructor() {
    super('Current password is wrong');
  }
}

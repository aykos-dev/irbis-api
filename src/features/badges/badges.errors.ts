import { HttpStatus } from '@nestjs/common';
import {
  DomainError,
  NotFoundError,
} from '../../common/errors/domain.error.js';

/** Missing, deleted, blocked and private profiles all answer the same 404 (no leak). */
export class BadgeProfileNotFoundError extends NotFoundError {
  override readonly code = 'PROFILE_NOT_FOUND';

  constructor() {
    super('Profile not found');
  }
}

/** The showcase only accepts badges the user has already earned. */
export class BadgeNotEarnedError extends DomainError {
  readonly code = 'BADGE_NOT_EARNED';
  readonly status = HttpStatus.BAD_REQUEST;

  constructor() {
    super('Only earned badges can be shown on the profile');
  }
}

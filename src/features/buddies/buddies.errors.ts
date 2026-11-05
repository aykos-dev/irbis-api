import { HttpStatus } from '@nestjs/common';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/domain.error.js';

/** 404: missing, deleted, blocked, demo or yourself. */
export class BuddyUserNotFoundError extends NotFoundError {
  override readonly code = 'BUDDY_USER_NOT_FOUND';
  constructor() {
    super('User not found');
  }
}

/** 409: the pair already has a pending or accepted link. */
export class BuddyExistsError extends ConflictError {
  override readonly code = 'BUDDY_EXISTS';
  constructor() {
    super('You are already buddies or a request is pending');
  }
}

/** 404: no pending request with this id addressed to the caller. */
export class BuddyRequestNotFoundError extends NotFoundError {
  override readonly code = 'BUDDY_REQUEST_NOT_FOUND';
  constructor() {
    super('Buddy request not found');
  }
}

/** 404: no accepted link and no outgoing pending request with this user. */
export class BuddyNotFoundError extends NotFoundError {
  override readonly code = 'BUDDY_NOT_FOUND';
  constructor() {
    super('Buddy not found');
  }
}

/** 403: the caller (or the person rated) has no attendance on the trip. */
export class NotAttendeeError extends ForbiddenError {
  override readonly code = 'NOT_ATTENDEE';
  constructor() {
    super('Only people who attended this trip can rate each other');
  }
}

/** 409: the 7-day rating window after backBy has passed. */
export class RatingClosedError extends ConflictError {
  override readonly code = 'RATING_CLOSED';
  constructor() {
    super('Rating for this trip has closed');
  }
}

/** 422: nobody rates themselves. */
export class RatingSelfError extends DomainError {
  readonly code = 'RATING_SELF';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;
  constructor() {
    super('You cannot rate yourself');
  }
}

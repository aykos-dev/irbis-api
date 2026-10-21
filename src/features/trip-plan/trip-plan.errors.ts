import { HttpStatus } from '@nestjs/common';
import {
  ConflictError,
  DomainError,
  NotFoundError,
} from '../../common/errors/domain.error.js';

/** 422: backBy not after startAt, longer than maxDurationH, start too far in the past or beyond planAheadDays. */
export class TripTimesInvalidError extends DomainError {
  readonly code = 'TRIP_TIMES_INVALID';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(reason: string) {
    super(`Trip times are invalid: ${reason}`);
  }
}

/** 422: a trip needs the user's emergency contact first. */
export class EmergencyContactRequiredError extends DomainError {
  readonly code = 'EMERGENCY_CONTACT_REQUIRED';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor() {
    super('Save an emergency contact before planning a trip');
  }
}

/** 409: the user already has an active trip. */
export class TripAlreadyActiveError extends ConflictError {
  override readonly code = 'TRIP_ALREADY_ACTIVE';

  constructor() {
    super('Another trip is already active');
  }
}

/** 404: no trip with this id for the signed-in user (other users' trips look the same). */
export class TripNotFoundError extends NotFoundError {
  override readonly code = 'TRIP_NOT_FOUND';

  constructor() {
    super('Trip not found');
  }
}

/** 409: the trip's status (or a sent alert) does not allow this change. */
export class TripNotEditableError extends ConflictError {
  override readonly code = 'TRIP_NOT_EDITABLE';

  constructor() {
    super('This trip can no longer be changed');
  }
}

/** 409: location pings need an active or alerted trip. */
export class TripNotActiveError extends ConflictError {
  override readonly code = 'TRIP_NOT_ACTIVE';

  constructor() {
    super('This trip is not active');
  }
}

/** 404: no live trip behind this link (unknown token or a trip that has not started). */
export class LiveNotFoundError extends NotFoundError {
  override readonly code = 'LIVE_NOT_FOUND';

  constructor() {
    super('Live trip not found');
  }
}

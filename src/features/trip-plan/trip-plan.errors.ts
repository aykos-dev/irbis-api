import { HttpStatus } from '@nestjs/common';
import {
  ConflictError,
  DomainError,
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

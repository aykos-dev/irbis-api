import { HttpStatus } from '@nestjs/common';
import { DomainError } from '../../common/errors/domain.error.js';

/** 422: the fix was recorded longer ago than `maxAgeHours` (queued too long offline). */
export class CheckInTooOldError extends DomainError {
  readonly code = 'CHECK_IN_TOO_OLD';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor() {
    super('This check-in was recorded too long ago');
  }
}

/** 422: the fix is too inaccurate for a check-in. */
export class LocationInaccurateError extends DomainError {
  readonly code = 'LOCATION_INACCURATE';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor() {
    super('Location is not accurate enough for a check-in');
  }
}

/** 422: the fix is outside the place's check-in radius; `details` has the distance and the radius. */
export class CheckInTooFarError extends DomainError {
  readonly code = 'CHECK_IN_TOO_FAR';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;
  override readonly details: { distanceM: number; radiusM: number };

  constructor(distanceM: number, radiusM: number) {
    super('Too far from the place to check in');
    this.details = { distanceM, radiusM };
  }
}

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

/** 422: the fix is too inaccurate for a waypoint check-in. */
export class LocationInaccurateError extends DomainError {
  readonly code = 'LOCATION_INACCURATE';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor() {
    super('Location is not accurate enough for a check-in');
  }
}

/** 409: the trip already has the maximum number of waypoints. */
export class WaypointLimitError extends ConflictError {
  override readonly code = 'WAYPOINT_LIMIT';

  constructor() {
    super('This trip has no waypoint check-ins left');
  }
}

/** 422: too close to an earlier waypoint; `details.remainingM` metres still to go. */
export class WaypointTooCloseError extends DomainError {
  readonly code = 'WAYPOINT_TOO_CLOSE';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;
  override readonly details: { remainingM: number };

  constructor(remainingM: number) {
    super('Too close to an earlier waypoint');
    this.details = { remainingM };
  }
}

/** 422: too soon after the previous waypoint; `details.remainingMin` minutes still to wait. */
export class WaypointTooSoonError extends DomainError {
  readonly code = 'WAYPOINT_TOO_SOON';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;
  override readonly details: { remainingMin: number };

  constructor(remainingMin: number) {
    super('Too soon after the previous waypoint');
    this.details = { remainingMin };
  }
}

/** 429: an SOS was sent moments ago; `details.retryInSec` seconds until the next one. */
export class SosTooSoonError extends DomainError {
  readonly code = 'SOS_TOO_SOON';
  readonly status = HttpStatus.TOO_MANY_REQUESTS;
  override readonly details: { retryInSec: number };

  constructor(retryInSec: number) {
    super('An SOS was sent moments ago');
    this.details = { retryInSec };
  }
}

/** 502: the SOS text could not be sent; the app falls back to the phone's SMS app. */
export class SosSendFailedError extends DomainError {
  readonly code = 'SOS_SEND_FAILED';
  readonly status = HttpStatus.BAD_GATEWAY;

  constructor() {
    super('The SOS text could not be sent');
  }
}

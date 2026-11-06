import { HttpStatus } from '@nestjs/common';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/domain.error.js';

/** 403: creating needs owner/admin of a group; deciding requests needs the trip's leader. */
export class TripLeaderRequiredError extends ForbiddenError {
  override readonly code = 'TRIP_LEADER_REQUIRED';
  constructor(message = 'Only a group owner or admin can lead a trip') {
    super(message);
  }
}

/** 403: a linked group is one where the caller is not an active owner/admin. */
export class GroupLinkForbiddenError extends ForbiddenError {
  override readonly code = 'GROUP_LINK_FORBIDDEN';
  constructor() {
    super('You can only link groups you own or administer');
  }
}

/** 403: demo accounts must be secured first. */
export class SecuredAccountRequiredError extends ForbiddenError {
  override readonly code = 'SECURED_ACCOUNT_REQUIRED';
  constructor() {
    super('Secure your account first');
  }
}

/** 422: `fieldErrors` maps each invalid field to its reason codes. */
export class GroupTripInvalidError extends DomainError {
  readonly code = 'GROUP_TRIP_INVALID';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;
  constructor(override readonly fieldErrors: Record<string, string[]>) {
    super('Group trip is invalid');
  }
}

/** 404: unknown, or private and not visible to the caller. */
export class GroupTripNotFoundError extends NotFoundError {
  override readonly code = 'GROUP_TRIP_NOT_FOUND';
  constructor() {
    super('Group trip not found');
  }
}

/** 404: no pending request from this user on the trip. */
export class GroupTripRequestNotFoundError extends NotFoundError {
  override readonly code = 'GROUP_TRIP_REQUEST_NOT_FOUND';
  constructor() {
    super('Join request not found');
  }
}

/** 409: cancelled or already started. */
export class GroupTripClosedError extends ConflictError {
  override readonly code = 'GROUP_TRIP_CLOSED';
  constructor() {
    super('This trip no longer takes requests');
  }
}

/** 409: approved people already reach maxPeople. */
export class GroupTripFullError extends ConflictError {
  override readonly code = 'GROUP_TRIP_FULL';
  constructor() {
    super('This trip is full');
  }
}

/** 409: the caller already has a pending or approved row. */
export class AlreadyRequestedError extends ConflictError {
  override readonly code = 'ALREADY_REQUESTED';
  constructor() {
    super('You already asked to join this trip');
  }
}

/** 409: the trip's Asia/Tashkent start day has begun; it can no longer be edited. */
export class GroupTripLockedError extends ConflictError {
  override readonly code = 'GROUP_TRIP_LOCKED';
  constructor() {
    super('This trip can no longer be edited');
  }
}

/** 409: the leader cancels the trip instead of leaving it. */
export class LeaderCannotLeaveError extends ConflictError {
  override readonly code = 'LEADER_CANNOT_LEAVE';
  constructor() {
    super('The leader cannot leave; cancel the trip instead');
  }
}

/** 404: the caller has no pending or approved row on the trip. */
export class NotOnGroupTripError extends NotFoundError {
  override readonly code = 'NOT_ON_GROUP_TRIP';
  constructor() {
    super('You are not on this trip');
  }
}

import { HttpStatus } from '@nestjs/common';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/domain.error.js';

export class GroupNotFoundError extends NotFoundError {
  override readonly code = 'GROUP_NOT_FOUND';
  constructor() {
    super('Group not found');
  }
}

export class GroupMembershipRequiredError extends ForbiddenError {
  override readonly code = 'GROUP_MEMBERSHIP_REQUIRED';
  constructor() {
    super('Active group membership required');
  }
}

export class GroupAdminRequiredError extends ForbiddenError {
  override readonly code = 'GROUP_ADMIN_REQUIRED';
  constructor() {
    super('Group administrator access required');
  }
}

export class GroupOwnerRequiredError extends ForbiddenError {
  override readonly code = 'GROUP_OWNER_REQUIRED';
  constructor() {
    super('Group owner access required');
  }
}

export class GroupAlreadyMemberError extends ConflictError {
  override readonly code = 'GROUP_ALREADY_MEMBER';
  constructor() {
    super('Already a member of this group');
  }
}

export class GroupRequestPendingError extends ConflictError {
  override readonly code = 'GROUP_REQUEST_PENDING';
  constructor() {
    super('A membership request is already pending');
  }
}

export class GroupInvitationRequiredError extends DomainError {
  readonly code = 'GROUP_INVITATION_REQUIRED';
  readonly status = HttpStatus.BAD_REQUEST;
  constructor() {
    super('No invitation is waiting for this user');
  }
}

export class GroupMemberNotFoundError extends NotFoundError {
  override readonly code = 'GROUP_MEMBER_NOT_FOUND';
  constructor() {
    super('Group member not found');
  }
}

export class GroupOwnerProtectedError extends ConflictError {
  override readonly code = 'GROUP_OWNER_PROTECTED';
  constructor() {
    super('Transfer ownership before changing or removing the owner');
  }
}

export class GroupNeedsSecondAdminError extends ConflictError {
  override readonly code = 'GROUP_NEEDS_SECOND_ADMIN';
  constructor() {
    super(
      'Public groups over 500 members must keep at least two administrators',
    );
  }
}

export class GroupCannotInviteError extends ConflictError {
  override readonly code = 'GROUP_CANNOT_INVITE';
  constructor() {
    super('This user cannot be invited to the group');
  }
}

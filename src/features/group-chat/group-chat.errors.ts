import { HttpStatus } from '@nestjs/common';
import {
  DomainError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/domain.error.js';

export class GroupMessageNotFoundError extends NotFoundError {
  override readonly code = 'GROUP_MESSAGE_NOT_FOUND';
  constructor() {
    super('Group message not found');
  }
}

export class GroupMessageEmptyError extends DomainError {
  readonly code = 'GROUP_MESSAGE_EMPTY';
  readonly status = HttpStatus.BAD_REQUEST;
  constructor() {
    super('A message needs text or an attachment');
  }
}

export class GroupMessageEditForbiddenError extends ForbiddenError {
  override readonly code = 'GROUP_MESSAGE_EDIT_FORBIDDEN';
  constructor() {
    super('Only the author can edit this message');
  }
}

export class GroupMessageDeleteForbiddenError extends ForbiddenError {
  override readonly code = 'GROUP_MESSAGE_DELETE_FORBIDDEN';
  constructor() {
    super('Only the author or a group administrator can delete this message');
  }
}

export class GroupAttachmentInvalidError extends DomainError {
  readonly code = 'GROUP_ATTACHMENT_INVALID';
  readonly status = HttpStatus.BAD_REQUEST;
  constructor() {
    super('The message attachment is invalid');
  }
}

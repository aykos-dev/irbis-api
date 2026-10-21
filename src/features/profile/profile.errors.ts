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

/** The username change or account deletion was confirmed with a wrong current password. */
export class InvalidPasswordError extends DomainError {
  readonly code = 'INVALID_PASSWORD';
  readonly status = HttpStatus.UNAUTHORIZED;

  constructor() {
    super('Current password is wrong');
  }
}

/** The avatar bytes are not one of the formats the API re-encodes (JPEG, PNG, WebP). */
export class AvatarImageTypeError extends DomainError {
  readonly code = 'IMAGE_TYPE';
  readonly status = HttpStatus.UNSUPPORTED_MEDIA_TYPE;

  constructor() {
    super('Only JPEG, PNG or WebP images are accepted');
  }
}

/** Multer's 2 MB limit and the service check both answer this code. */
export class AvatarImageTooLargeError extends DomainError {
  readonly code = 'IMAGE_TOO_LARGE';
  readonly status = HttpStatus.PAYLOAD_TOO_LARGE;

  constructor() {
    super('The image is larger than 2 MB');
  }
}

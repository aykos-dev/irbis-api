import { NotFoundError } from '../../common/errors/domain.error.js';

/** Missing, deleted, blocked and private profiles all answer the same 404 (no leak). */
export class ProfileNotFoundError extends NotFoundError {
  override readonly code = 'PROFILE_NOT_FOUND';

  constructor() {
    super('Profile not found');
  }
}

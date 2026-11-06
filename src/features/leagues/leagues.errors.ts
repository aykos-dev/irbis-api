import { NotFoundError } from '../../common/errors/domain.error.js';

export class LeagueProfileNotFoundError extends NotFoundError {
  override readonly code = 'PROFILE_NOT_FOUND';

  constructor() {
    super('Profile not found');
  }
}

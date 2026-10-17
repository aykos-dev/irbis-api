import { NotFoundError } from '../../common/errors/domain.error.js';

export class PlaceNotFoundError extends NotFoundError {
  override readonly code = 'PLACE_NOT_FOUND';

  constructor() {
    super('Place not found');
  }
}

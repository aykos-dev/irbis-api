import {
  ConflictError,
  NotFoundError,
} from '../../common/errors/domain.error.js';

/** The user has no stored path for this Asia/Tashkent month. */
export class PathNotFoundError extends NotFoundError {
  override readonly code = 'PATH_NOT_FOUND';

  constructor() {
    super('No path for this month');
  }
}

/** The chest opens only when every node of the month is done (and there is at least one). */
export class PathChestLockedError extends ConflictError {
  override readonly code = 'PATH_CHEST_LOCKED';

  constructor() {
    super('Not every path node is done yet');
  }
}

/** The place is not a node of this month's path. */
export class PlaceNotOnPathError extends NotFoundError {
  override readonly code = 'PLACE_NOT_ON_PATH';

  constructor() {
    super('Place is not on this month’s path');
  }
}

import { HttpStatus } from '@nestjs/common';
import { DomainError } from '../../common/errors/domain.error.js';

/** A GameConfig row is missing or fails its schema. Internal only: clients see a generic message. */
export class GameConfigInvalidError extends DomainError {
  readonly code = 'GAME_CONFIG_INVALID';
  readonly status = HttpStatus.INTERNAL_SERVER_ERROR;

  constructor(
    readonly key: string,
    readonly detail: string,
  ) {
    super('Game configuration is invalid');
  }
}

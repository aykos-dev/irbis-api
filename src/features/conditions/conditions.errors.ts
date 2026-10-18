import {
  ConflictError,
  NotFoundError,
} from '../../common/errors/domain.error.js';

export class ClosureNotFoundError extends NotFoundError {
  override readonly code = 'CLOSURE_NOT_FOUND';

  constructor() {
    super('Closure not found');
  }
}

export class OverrideNotFoundError extends NotFoundError {
  override readonly code = 'OVERRIDE_NOT_FOUND';

  constructor() {
    super('Override not found');
  }
}

export class ClosureAlreadyEndedError extends ConflictError {
  override readonly code = 'CLOSURE_ALREADY_ENDED';

  constructor() {
    super('Closure already ended');
  }
}

export class OverrideAlreadyEndedError extends ConflictError {
  override readonly code = 'OVERRIDE_ALREADY_ENDED';

  constructor() {
    super('Override already ended');
  }
}

export class RecomputeRunningError extends ConflictError {
  override readonly code = 'RECOMPUTE_RUNNING';

  constructor() {
    super('A conditions run is already in progress');
  }
}

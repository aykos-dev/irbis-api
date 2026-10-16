import { HttpStatus } from '@nestjs/common';

/**
 * Base for every business error. `code` is stable and what clients branch on;
 * `message` is for humans and logs. Feature errors live in `<slug>.errors.ts`.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly status: HttpStatus;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code: string = 'NOT_FOUND';
  readonly status = HttpStatus.NOT_FOUND;
}

export class ConflictError extends DomainError {
  readonly code: string = 'CONFLICT';
  readonly status = HttpStatus.CONFLICT;
}

export class ForbiddenError extends DomainError {
  readonly code: string = 'FORBIDDEN';
  readonly status = HttpStatus.FORBIDDEN;
}

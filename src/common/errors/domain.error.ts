import { HttpStatus } from '@nestjs/common';

/**
 * Base for every business error. `code` is stable and what clients branch on;
 * `message` is for humans and logs. Feature errors live in `<slug>.errors.ts`.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly status: HttpStatus;
  /** Extra machine-readable fields clients may need; the filter copies them into the response. */
  readonly fieldErrors?: Record<string, string[]>;
  readonly reasonCode?: string;
  readonly retryAfterSec?: number;
  /** Code-specific numbers the client shows (e.g. metres or seconds still to go). */
  readonly details?: Record<string, number>;

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

/** 429 for any rate limit: the global throttler, per-IP log-in limits and per-account SMS limits. */
export class RateLimitedError extends DomainError {
  readonly code: string = 'RATE_LIMITED';
  readonly status = HttpStatus.TOO_MANY_REQUESTS;

  constructor(
    message: string,
    override readonly retryAfterSec?: number,
  ) {
    super(message);
  }
}

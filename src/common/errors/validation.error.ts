import { HttpStatus, type ValidationError } from '@nestjs/common';
import { DomainError } from './domain.error.js';
import { ErrorCode } from './error-codes.js';

export type FieldErrors = Record<string, string[]>;

/** Thrown by the global ValidationPipe. `fieldErrors` maps dotted field paths to validator codes. */
export class RequestValidationError extends DomainError {
  readonly code = ErrorCode.ValidationFailed;
  readonly status = HttpStatus.BAD_REQUEST;

  constructor(readonly fieldErrors: FieldErrors) {
    super('Request validation failed');
  }

  static fromValidationErrors(
    errors: ValidationError[],
  ): RequestValidationError {
    const fieldErrors: FieldErrors = {};
    const walk = (list: ValidationError[], prefix: string): void => {
      for (const error of list) {
        const path = prefix ? `${prefix}.${error.property}` : error.property;
        if (error.constraints) {
          fieldErrors[path] = Object.keys(error.constraints);
        }
        if (error.children?.length) {
          walk(error.children, path);
        }
      }
    };
    walk(errors, '');
    return new RequestValidationError(fieldErrors);
  }
}

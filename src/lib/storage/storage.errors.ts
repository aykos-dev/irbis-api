import { HttpStatus } from '@nestjs/common';
import { DomainError } from '../../common/errors/domain.error.js';

/**
 * 503: object storage is not configured or an S3 call failed. `storageError` is the S3 error
 * name only (no request, headers or credentials) so the 5xx log line stays safe.
 */
export class StorageUnavailableError extends DomainError {
  readonly code = 'STORAGE_UNAVAILABLE';
  readonly status = HttpStatus.SERVICE_UNAVAILABLE;

  constructor(readonly storageError: string) {
    super('Image storage is unavailable, try again later');
  }
}

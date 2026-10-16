/** Codes produced by the framework layer (not by a feature's domain errors). */
export const ErrorCode = {
  ValidationFailed: 'VALIDATION_FAILED',
  Unauthenticated: 'UNAUTHENTICATED',
  Forbidden: 'FORBIDDEN',
  NotFound: 'NOT_FOUND',
  TooManyRequests: 'TOO_MANY_REQUESTS',
  PayloadTooLarge: 'PAYLOAD_TOO_LARGE',
  BadRequest: 'BAD_REQUEST',
  InternalError: 'INTERNAL_ERROR',
} as const;

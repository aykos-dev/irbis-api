import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ErrorResponseDto } from '../dto/error-response.dto.js';
import { DomainError } from '../errors/domain.error.js';
import { ErrorCode } from '../errors/error-codes.js';
import { RequestValidationError } from '../errors/validation.error.js';
import { requestIdOf } from '../request-id.js';

const CODE_BY_STATUS: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.BadRequest,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.Unauthenticated,
  [HttpStatus.FORBIDDEN]: ErrorCode.Forbidden,
  [HttpStatus.NOT_FOUND]: ErrorCode.NotFound,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.PayloadTooLarge,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TooManyRequests,
};

const SAFE_MESSAGE: Partial<Record<number, string>> = {
  [HttpStatus.UNAUTHORIZED]: 'Authentication required',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not found',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'Request body too large',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too many requests',
};

/**
 * 4xx status of an HttpException, or of an exposed http-errors error raised by Express
 * middleware before Nest (body-parser: malformed JSON → 400, too large → 413).
 */
function clientErrorStatus(exception: unknown): number | undefined {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return status < 500 ? status : undefined;
  }
  if (
    exception instanceof Error &&
    'status' in exception &&
    'expose' in exception
  ) {
    const { status, expose } = exception;
    if (
      expose === true &&
      typeof status === 'number' &&
      status >= 400 &&
      status < 500
    ) {
      return status;
    }
  }
  return undefined;
}

/** Turns every thrown value into `{ statusCode, code, message, fieldErrors?, requestId }`. */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request & { id?: unknown }>();
    const res = http.getResponse<Response>();
    const body = this.toBody(exception, requestIdOf(req));

    if (body.statusCode >= 500) {
      this.logger.error(
        { err: exception, requestId: body.requestId },
        'Unhandled error',
      );
    }
    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown, requestId: string): ErrorResponseDto {
    if (exception instanceof RequestValidationError) {
      return {
        statusCode: exception.status,
        code: exception.code,
        message: exception.message,
        fieldErrors: exception.fieldErrors,
        requestId,
      };
    }
    if (exception instanceof DomainError) {
      return {
        statusCode: exception.status,
        code: exception.code,
        message: exception.message,
        requestId,
      };
    }
    const statusCode = clientErrorStatus(exception);
    if (statusCode !== undefined) {
      return {
        statusCode,
        code: CODE_BY_STATUS[statusCode] ?? ErrorCode.BadRequest,
        message: SAFE_MESSAGE[statusCode] ?? 'Bad request',
        requestId,
      };
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.InternalError,
      message: 'Internal server error',
      requestId,
    };
  }
}

import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { catchError, type Observable, throwError } from 'rxjs';
import { AvatarImageTooLargeError } from './profile.errors.js';

/** Multer's file-size limit surfaces as a generic 413; this gives it the IMAGE_TOO_LARGE code. */
@Injectable()
export class AvatarTooLargeInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next
      .handle()
      .pipe(
        catchError((error: unknown) =>
          throwError(() =>
            error instanceof PayloadTooLargeException
              ? new AvatarImageTooLargeError()
              : error,
          ),
        ),
      );
  }
}

import { type ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import { RateLimitedError } from '../errors/domain.error.js';

/** The global rate limiter; a hit becomes the standard `RATE_LIMITED` error with `retryAfterSec`. */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  override canActivate(context: ExecutionContext): Promise<boolean> {
    if (typeof context.getType === 'function' && context.getType() === 'ws') {
      return Promise.resolve(true);
    }
    return super.canActivate(context);
  }

  protected override throwThrottlingException(
    _context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    return Promise.reject(
      new RateLimitedError(
        'Too many requests',
        Math.max(1, detail.timeToBlockExpire || detail.timeToExpire),
      ),
    );
  }
}

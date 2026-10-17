import { type ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export type ThrottleTier = 'auth' | 'lookup';

const keyOf = (tier: ThrottleTier): string => `throttle:${tier}`;
const reflector = new Reflector();

/**
 * Opts a route into a stricter named limiter (limits come from config):
 * `auth` for sign-up / log-in / refresh / reset, `lookup` for the username availability check.
 */
export const Throttled = (
  tier: ThrottleTier,
): MethodDecorator & ClassDecorator => SetMetadata(keyOf(tier), true);

/** `skipIf` for a named throttler: skip every route that did not opt into the tier. */
export const skipUnlessThrottled =
  (tier: ThrottleTier) =>
  (context: ExecutionContext): boolean =>
    !reflector.getAllAndOverride<boolean | undefined>(keyOf(tier), [
      context.getHandler(),
      context.getClass(),
    ]);

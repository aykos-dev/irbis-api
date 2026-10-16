import {
  createParamDecorator,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthUser } from '../auth-user.js';

/** Injects the authenticated caller. Only valid on routes behind the JWT guard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const user = ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  },
);

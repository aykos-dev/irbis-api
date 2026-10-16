import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser, Role } from '../auth-user.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { ForbiddenError } from '../errors/domain.error.js';

/** Enforces `@Roles()`. Runs after JwtAuthGuard, so `req.user` is set on protected routes. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) {
      return true;
    }
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenError('Insufficient role');
    }
    return true;
  }
}

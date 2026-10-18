import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '../../../common/auth-user.js';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator.js';
import { AccountBlockedError } from '../auth.errors.js';
import { AuthService } from '../auth.service.js';

/**
 * Runs after the JWT guard on authenticated routes: refuses blocked or deleted accounts (AC11)
 * and replaces the role from the token with the current one, so role changes apply immediately.
 * On `@Public()` routes a blocked or deleted account is treated as a guest instead.
 */
@Injectable()
export class AccountStatusGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!req.user) return true;
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    try {
      const { role } = await this.auth.checkSession(req.user.id);
      req.user = { id: req.user.id, role };
    } catch (error) {
      const refused =
        error instanceof UnauthorizedException ||
        error instanceof AccountBlockedError;
      if (!isPublic || !refused) throw error;
      req.user = undefined;
    }
    return true;
  }
}

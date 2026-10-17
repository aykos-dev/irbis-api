import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { AuthUser } from '../../../common/auth-user.js';
import { AuthService } from '../auth.service.js';

/**
 * Runs after the JWT guard on authenticated routes: refuses blocked or deleted accounts (AC11)
 * and replaces the role from the token with the current one, so role changes apply immediately.
 */
@Injectable()
export class AccountStatusGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!req.user) return true;
    const { role } = await this.auth.checkSession(req.user.id);
    req.user = { id: req.user.id, role };
    return true;
  }
}

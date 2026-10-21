import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AppConfig } from '../../config/app-config.js';
import { type AuthUser, isRole } from '../auth-user.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

interface AccessTokenPayload {
  sub?: unknown;
  role?: unknown;
  sid?: unknown;
}

/**
 * Global, deny-by-default: every route needs a valid HS256 access token unless `@Public()`.
 * On `@Public()` routes a valid token still sets the user; a missing or bad one means guest.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    if (isPublic) {
      // Optional auth: a valid token identifies the viewer; anything else is a guest, never a 401.
      const token = this.bearerTokenOrNull(req);
      if (token) {
        req.user = await this.verify(token).catch((error: unknown) => {
          if (error instanceof UnauthorizedException) return undefined;
          throw error;
        });
      }
      return true;
    }

    const token = this.bearerTokenOrNull(req);
    if (!token) throw new UnauthorizedException();
    req.user = await this.verify(token);
    return true;
  }

  private async verify(token: string): Promise<AuthUser> {
    const payload = await this.jwt
      .verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.jwtAccessSecret,
        algorithms: ['HS256'],
      })
      .catch((error: unknown) => {
        throw new UnauthorizedException(undefined, { cause: error });
      });
    if (typeof payload.sub !== 'string' || !isRole(payload.role)) {
      throw new UnauthorizedException();
    }
    // Old tokens predate `sid`: they authenticate without a current session family.
    return typeof payload.sid === 'string'
      ? { id: payload.sub, role: payload.role, sessionId: payload.sid }
      : { id: payload.sub, role: payload.role };
  }

  private bearerTokenOrNull(req: Request): string | null {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    return scheme === 'Bearer' && token ? token : null;
  }
}

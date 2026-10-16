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
}

/** Global, deny-by-default: every route needs a valid HS256 access token unless `@Public()`. */
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
    if (isPublic) {
      return true;
    }

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const token = this.bearerToken(req);
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
    req.user = { id: payload.sub, role: payload.role };
    return true;
  }

  private bearerToken(req: Request): string {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException();
    }
    return token;
  }
}

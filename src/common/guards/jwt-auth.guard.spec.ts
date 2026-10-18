import { randomBytes } from 'node:crypto';
import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AppConfig } from '../../config/app-config.js';
import type { AuthUser } from '../auth-user.js';
import { Public } from '../decorators/public.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const secret = randomBytes(32).toString('hex');
const jwt = new JwtService();
const guard = new JwtAuthGuard(new Reflector(), jwt, {
  jwtAccessSecret: secret,
} as AppConfig);

class Routes {
  protectedRoute(this: void): void {}

  @Public()
  publicRoute(this: void): void {}
}

function contextFor(handler: keyof Routes, authorization?: string) {
  const req: { headers: Record<string, string>; user?: AuthUser } = {
    headers: authorization ? { authorization } : {},
  };
  const context = {
    getHandler: () => Routes.prototype[handler],
    getClass: () => Routes,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { context, req };
}

describe('JwtAuthGuard', () => {
  it('lets @Public() routes through without a token', async () => {
    await expect(
      guard.canActivate(contextFor('publicRoute').context),
    ).resolves.toBe(true);
  });

  it('denies by default when no token is sent', async () => {
    await expect(
      guard.canActivate(contextFor('protectedRoute').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a valid HS256 token and sets the current user', async () => {
    const token = await jwt.signAsync(
      { sub: 'user_1', role: 'admin' },
      { secret, algorithm: 'HS256' },
    );
    const { context, req } = contextFor('protectedRoute', `Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(req.user).toEqual({ id: 'user_1', role: 'admin' });
  });

  it('rejects a token signed with another secret', async () => {
    const token = await jwt.signAsync(
      { sub: 'user_1', role: 'user' },
      { secret: randomBytes(32).toString('hex'), algorithm: 'HS256' },
    );
    await expect(
      guard.canActivate(
        contextFor('protectedRoute', `Bearer ${token}`).context,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token without a known role', async () => {
    const token = await jwt.signAsync(
      { sub: 'user_1', role: 'root' },
      { secret, algorithm: 'HS256' },
    );
    await expect(
      guard.canActivate(
        contextFor('protectedRoute', `Bearer ${token}`).context,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('JwtAuthGuard: optional auth on @Public() routes (levels AC4)', () => {
  it('sets the user when a valid token is sent', async () => {
    const token = await jwt.signAsync(
      { sub: 'user_1', role: 'user' },
      { secret, algorithm: 'HS256' },
    );
    const { context, req } = contextFor('publicRoute', `Bearer ${token}`);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(req.user).toEqual({ id: 'user_1', role: 'user' });
  });

  it('continues as a guest with a bad, foreign or expired token', async () => {
    const foreign = await jwt.signAsync(
      { sub: 'user_1', role: 'user' },
      { secret: randomBytes(32).toString('hex'), algorithm: 'HS256' },
    );
    const expired = await jwt.signAsync(
      { sub: 'user_1', role: 'user', exp: Math.floor(Date.now() / 1000) - 60 },
      { secret, algorithm: 'HS256' },
    );
    for (const token of ['not-a-jwt', foreign, expired]) {
      const { context, req } = contextFor('publicRoute', `Bearer ${token}`);
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(req.user).toBeUndefined();
    }
  });
});

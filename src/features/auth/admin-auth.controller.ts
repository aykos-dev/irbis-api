import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { ClientIp } from '../../common/decorators/client-ip.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Throttled } from '../../common/decorators/throttle.decorator.js';
import { AppConfig } from '../../config/app-config.js';
import {
  ADMIN_REFRESH_COOKIE,
  ADMIN_REFRESH_COOKIE_PATH,
} from './auth.constants.js';
import { RefreshInvalidError } from './auth.errors.js';
import { AuthService } from './auth.service.js';
import { LogInDto } from './dto/auth.request.dto.js';
import {
  AdminAccessResponseDto,
  AdminSessionResponseDto,
} from './dto/session.response.dto.js';

/** Admin web sessions: the refresh token travels only in an httpOnly Secure SameSite=Lax cookie. */
@ApiTags('Admin auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  @Public()
  @Throttled('auth')
  @Post('log-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'AdminAuth_logIn',
    summary: 'Admin log-in; sets the refresh cookie',
  })
  @ApiOkResponse({
    type: AdminSessionResponseDto,
    description:
      'Access token + me. The refresh token is in the `Set-Cookie` header only.',
  })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    401: ['INVALID_CREDENTIALS'],
    403: ['NOT_ADMIN', 'ACCOUNT_BLOCKED'],
    423: ['ACCOUNT_LOCKED'],
    429: ['RATE_LIMITED'],
  })
  async logIn(
    @Body() dto: LogInDto,
    @ClientIp() ip: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AdminSessionResponseDto> {
    const { refreshToken, accessToken, expiresIn, me } = await this.auth.logIn(
      dto,
      ip,
      { requireAdmin: true },
    );
    res.cookie(ADMIN_REFRESH_COOKIE, refreshToken, this.cookieOptions());
    return { accessToken, expiresIn, me };
  }

  @Public()
  @Throttled('auth')
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'AdminAuth_refresh',
    summary: 'New access token from the refresh cookie; rotates the cookie',
  })
  @ApiOkResponse({ type: AdminAccessResponseDto })
  @ApiErrorResponses({
    401: ['REFRESH_INVALID', 'REFRESH_REUSED'],
    403: ['ACCOUNT_BLOCKED'],
    429: ['RATE_LIMITED'],
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AdminAccessResponseDto> {
    const token = this.cookieToken(req);
    try {
      const issued = await this.auth.refreshAdmin(token);
      res.cookie(
        ADMIN_REFRESH_COOKIE,
        issued.refreshToken,
        this.cookieOptions(),
      );
      return { accessToken: issued.accessToken, expiresIn: issued.expiresIn };
    } catch (error) {
      res.clearCookie(ADMIN_REFRESH_COOKIE, this.cookieOptions());
      throw error;
    }
  }

  @Public()
  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'AdminAuth_signOut',
    summary: 'End the admin session and clear the cookie',
  })
  @ApiNoContentResponse()
  @ApiErrorResponses({ 401: ['REFRESH_INVALID'] })
  async signOut(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    res.clearCookie(ADMIN_REFRESH_COOKIE, this.cookieOptions());
    await this.auth.signOutAdmin(this.cookieToken(req));
  }

  private cookieToken(req: Request): string {
    const token: unknown = (
      req.cookies as Record<string, unknown> | undefined
    )?.[ADMIN_REFRESH_COOKIE];
    if (typeof token !== 'string' || token.length === 0) {
      throw new RefreshInvalidError();
    }
    return token;
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: ADMIN_REFRESH_COOKIE_PATH,
      maxAge: this.config.refreshTtlDays * 86_400_000,
    };
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { ClientIp } from '../../common/decorators/client-ip.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Throttled } from '../../common/decorators/throttle.decorator.js';
import type { AuthUser } from '../../common/auth-user.js';
import { AuthService } from './auth.service.js';
import {
  ForgotPasswordDto,
  LogInDto,
  RefreshDto,
  ResetPasswordDto,
  SignUpDto,
  UsernameAvailableQueryDto,
} from './dto/auth.request.dto.js';
import {
  AuthSessionResponseDto,
  CodeSentResponseDto,
  TokensResponseDto,
  UsernameAvailabilityResponseDto,
} from './dto/session.response.dto.js';
import { RecoveryService } from './recovery.service.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly recovery: RecoveryService,
  ) {}

  @Public()
  @Throttled('auth')
  @Post('sign-up')
  @ApiOperation({
    operationId: 'Auth_signUp',
    summary: 'Create an account and log in',
  })
  @ApiCreatedResponse({ type: AuthSessionResponseDto })
  @ApiErrorResponses({
    400: [
      'VALIDATION_FAILED',
      'USERNAME_INVALID',
      'USERNAME_RESERVED',
      'PASSWORD_WEAK',
      'TERMS_REQUIRED',
      'PHONE_INVALID',
    ],
    409: ['USERNAME_TAKEN'],
    429: ['RATE_LIMITED'],
  })
  signUp(@Body() dto: SignUpDto): Promise<AuthSessionResponseDto> {
    return this.auth.signUp(dto);
  }

  @Public()
  @Throttled('lookup')
  @Get('username-available')
  @ApiOperation({
    operationId: 'Auth_usernameAvailable',
    summary: 'Live username check while typing',
  })
  @ApiOkResponse({ type: UsernameAvailabilityResponseDto })
  @ApiErrorResponses({ 400: ['VALIDATION_FAILED'], 429: ['RATE_LIMITED'] })
  usernameAvailable(
    @Query() query: UsernameAvailableQueryDto,
  ): Promise<UsernameAvailabilityResponseDto> {
    return this.auth.usernameAvailability(query.u);
  }

  @Public()
  @Throttled('auth')
  @Post('log-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'Auth_logIn',
    summary: 'Log in with username and password',
  })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    401: ['INVALID_CREDENTIALS'],
    403: ['ACCOUNT_BLOCKED'],
    423: ['ACCOUNT_LOCKED'],
    429: ['RATE_LIMITED'],
  })
  async logIn(
    @Body() dto: LogInDto,
    @ClientIp() ip: string,
  ): Promise<AuthSessionResponseDto> {
    return this.auth.logIn(dto, ip, { requireAdmin: false });
  }

  @Public()
  @Throttled('auth')
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'Auth_refresh',
    summary: 'Rotate the refresh token and get a new access token',
  })
  @ApiOkResponse({ type: TokensResponseDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    401: ['REFRESH_INVALID', 'REFRESH_REUSED'],
    403: ['ACCOUNT_BLOCKED'],
    429: ['RATE_LIMITED'],
  })
  refresh(@Body() dto: RefreshDto): Promise<TokensResponseDto> {
    return this.auth.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'Auth_signOut',
    summary: 'End this session (revokes the refresh token family)',
  })
  @ApiNoContentResponse()
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    401: ['UNAUTHENTICATED'],
    403: ['ACCOUNT_BLOCKED'],
  })
  signOut(
    @CurrentUser() user: AuthUser,
    @Body() dto: RefreshDto,
  ): Promise<void> {
    return this.auth.signOut(user.id, dto.refreshToken);
  }

  @Public()
  @Throttled('auth')
  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    operationId: 'Auth_forgotPassword',
    summary:
      'Send a reset code by SMS (same answer whether or not the account or phone exists)',
  })
  @ApiAcceptedResponse({ type: CodeSentResponseDto })
  @ApiErrorResponses({ 400: ['VALIDATION_FAILED'], 429: ['RATE_LIMITED'] })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<CodeSentResponseDto> {
    return this.recovery.forgotPassword(dto.username);
  }

  @Public()
  @Throttled('auth')
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'Auth_resetPassword',
    summary: 'Set a new password with the SMS code; signs out other sessions',
  })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED', 'PASSWORD_WEAK', 'CODE_INVALID', 'CODE_EXPIRED'],
    403: ['ACCOUNT_BLOCKED'],
    429: ['CODE_ATTEMPTS', 'RATE_LIMITED'],
  })
  resetPassword(
    @Body() dto: ResetPasswordDto,
    @ClientIp() ip: string,
  ): Promise<AuthSessionResponseDto> {
    return this.recovery.resetPassword(dto, ip);
  }
}

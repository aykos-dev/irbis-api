import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Throttled } from '../../common/decorators/throttle.decorator.js';
import { AuthService } from './auth.service.js';
import {
  RecoveryPhoneDto,
  SecureAccountDto,
  VerifyRecoveryPhoneDto,
} from './dto/auth.request.dto.js';
import { GuestMergeDto, GuestMergeResponseDto } from './dto/guest-merge.dto.js';
import { MeResponseDto } from './dto/me.response.dto.js';
import { CodeSentResponseDto } from './dto/session.response.dto.js';
import { GuestMergeService } from './guest-merge/guest-merge.service.js';
import { MeService } from './me.service.js';
import { RecoveryService } from './recovery.service.js';

@ApiTags('Me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(
    private readonly me: MeService,
    private readonly recovery: RecoveryService,
    private readonly guestMerge: GuestMergeService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'Me_get', summary: 'The signed-in user' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiErrorResponses({ 401: ['UNAUTHENTICATED'], 403: ['ACCOUNT_BLOCKED'] })
  get(@CurrentUser() user: AuthUser): Promise<MeResponseDto> {
    return this.me.getMe(user.id);
  }

  @Throttled('auth')
  @Post('secure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'meSecure',
    summary:
      'Turn a demo account into a normal one: set username and password; keeps this session',
  })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiErrorResponses({
    400: [
      'VALIDATION_FAILED',
      'USERNAME_INVALID',
      'USERNAME_RESERVED',
      'PASSWORD_WEAK',
    ],
    401: ['UNAUTHENTICATED'],
    403: ['ACCOUNT_BLOCKED'],
    409: ['NOT_DEMO', 'USERNAME_TAKEN'],
    429: ['RATE_LIMITED'],
  })
  secure(
    @CurrentUser() user: AuthUser,
    @Body() dto: SecureAccountDto,
  ): Promise<MeResponseDto> {
    return this.auth.secure(user.id, dto);
  }

  @Throttled('auth')
  @Put('recovery-phone')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    operationId: 'Me_setRecoveryPhone',
    summary: 'Add or change the recovery phone; sends a code',
  })
  @ApiAcceptedResponse({ type: CodeSentResponseDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED', 'PHONE_INVALID'],
    401: ['UNAUTHENTICATED'],
    403: ['ACCOUNT_BLOCKED'],
    429: ['RATE_LIMITED'],
  })
  setRecoveryPhone(
    @CurrentUser() user: AuthUser,
    @Body() dto: RecoveryPhoneDto,
  ): Promise<CodeSentResponseDto> {
    return this.recovery.addRecoveryPhone(user.id, dto.phone);
  }

  @Throttled('auth')
  @Post('recovery-phone/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'Me_verifyRecoveryPhone',
    summary: 'Verify the recovery phone with the SMS code',
  })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED', 'CODE_INVALID', 'CODE_EXPIRED'],
    401: ['UNAUTHENTICATED'],
    403: ['ACCOUNT_BLOCKED'],
    429: ['CODE_ATTEMPTS', 'RATE_LIMITED'],
  })
  verifyRecoveryPhone(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyRecoveryPhoneDto,
  ): Promise<MeResponseDto> {
    return this.recovery.verifyRecoveryPhone(user.id, dto.code);
  }

  @Post('guest-merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'Me_guestMerge',
    summary: 'Move data kept on the device while a guest into the account',
  })
  @ApiOkResponse({ type: GuestMergeResponseDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    401: ['UNAUTHENTICATED'],
    403: ['ACCOUNT_BLOCKED'],
  })
  merge(
    @CurrentUser() user: AuthUser,
    @Body() dto: GuestMergeDto,
  ): Promise<GuestMergeResponseDto> {
    return this.guestMerge.merge(user.id, dto);
  }
}

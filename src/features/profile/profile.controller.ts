import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Throttled } from '../../common/decorators/throttle.decorator.js';
import { UpdateMeDto } from './dto/profile.request.dto.js';
import { MeResponseDto } from './dto/profile.response.dto.js';
import { PublicProfileResponseDto } from './dto/public-profile.response.dto.js';
import { ProfileService } from './profile.service.js';

@ApiTags('Profile')
@Controller('users')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Public()
  @Throttled('lookup')
  @Get(':username')
  @ApiOperation({
    operationId: 'Users_getProfile',
    summary: 'A public profile by username (case-insensitive)',
  })
  @ApiOkResponse({ type: PublicProfileResponseDto })
  @ApiErrorResponses({ 404: ['PROFILE_NOT_FOUND'], 429: ['RATE_LIMITED'] })
  getPublic(
    @Param('username') username: string,
  ): Promise<PublicProfileResponseDto> {
    return this.profile.getPublicProfile(username);
  }
}

@ApiTags('Me')
@ApiBearerAuth()
@Controller('me')
export class MeProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Throttled('auth')
  @Patch()
  @ApiOperation({
    operationId: 'Me_update',
    summary: 'Update the signed-in user profile fields and settings',
  })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED', 'USERNAME_INVALID', 'USERNAME_RESERVED'],
    401: ['UNAUTHENTICATED', 'INVALID_PASSWORD'],
    403: ['ACCOUNT_BLOCKED'],
    409: ['USERNAME_TAKEN'],
    429: ['RATE_LIMITED'],
  })
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMeDto,
  ): Promise<MeResponseDto> {
    return this.profile.updateMe(user.id, user.sessionId, dto);
  }
}

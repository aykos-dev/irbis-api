import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Throttled } from '../../common/decorators/throttle.decorator.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { UpdateMeDto } from './dto/profile.request.dto.js';
import { MeResponseDto } from './dto/profile.response.dto.js';
import { PublicProfileResponseDto } from './dto/public-profile.response.dto.js';
import { ProfileStatsDto } from './dto/profile-stats.response.dto.js';
import { AvatarTooLargeInterceptor } from './avatar-too-large.interceptor.js';
import { AVATAR_MAX_BYTES } from './profile-avatar.service.js';
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

  @Public()
  @Throttled('lookup')
  @Get(':username/stats')
  @ApiOperation({
    operationId: 'Users_getStats',
    summary: "A public profile's all-time stats (zeros when hidden)",
  })
  @ApiOkResponse({ type: ProfileStatsDto })
  @ApiErrorResponses({ 404: ['PROFILE_NOT_FOUND'], 429: ['RATE_LIMITED'] })
  getPublicStats(
    @Param('username') username: string,
  ): Promise<ProfileStatsDto> {
    return this.profile.publicStats(username);
  }
}

@ApiTags('Me')
@ApiBearerAuth()
@Controller('me')
export class MeProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get('stats')
  @ApiOperation({
    operationId: 'Me_stats',
    summary: "The signed-in user's all-time profile stats",
  })
  @ApiOkResponse({ type: ProfileStatsDto })
  @ApiErrorResponses({ 401: ['UNAUTHENTICATED'], 403: ['ACCOUNT_BLOCKED'] })
  stats(@CurrentUser() user: AuthUser): Promise<ProfileStatsDto> {
    return this.profile.meStats(user.id);
  }

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

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    AvatarTooLargeInterceptor,
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
    }),
  )
  @ApiOperation({
    operationId: 'Me_uploadAvatar',
    summary:
      'Upload an avatar (JPEG/PNG/WebP, ≤ 2 MB); stored as a 512×512 JPEG without metadata',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    401: ['UNAUTHENTICATED'],
    403: ['ACCOUNT_BLOCKED'],
    413: ['IMAGE_TOO_LARGE'],
    415: ['IMAGE_TYPE'],
    503: ['STORAGE_UNAVAILABLE'],
  })
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<MeResponseDto> {
    return this.profile.uploadAvatar(user.id, file?.buffer);
  }

  @Delete('avatar')
  @ApiOperation({
    operationId: 'Me_deleteAvatar',
    summary: 'Remove the avatar; the stored object stays orphaned (ADR-005)',
  })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiErrorResponses({
    401: ['UNAUTHENTICATED'],
    403: ['ACCOUNT_BLOCKED'],
  })
  removeAvatar(@CurrentUser() user: AuthUser): Promise<MeResponseDto> {
    return this.profile.removeAvatar(user.id);
  }

  @Throttled('auth')
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'Me_delete',
    summary:
      'Delete the signed-in account after confirming the current password',
  })
  @ApiNoContentResponse({
    description: 'The account is anonymised and signed out.',
  })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    401: ['UNAUTHENTICATED', 'INVALID_PASSWORD'],
    403: ['ACCOUNT_BLOCKED'],
    429: ['RATE_LIMITED'],
  })
  deleteAccount(
    @CurrentUser() user: AuthUser,
    @Body() dto: DeleteAccountDto,
  ): Promise<void> {
    return this.profile.deleteAccount(user.id, dto);
  }
}

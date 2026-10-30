import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CurrentUser, OptionalUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Throttled } from '../../common/decorators/throttle.decorator.js';
import { BadgesService } from './badges.service.js';
import { SetShowcaseDto } from './dto/badges.request.dto.js';
import {
  BadgesListDto,
  PublicBadgesDto,
} from './dto/badges.response.dto.js';

@ApiTags('Badges')
@Controller()
export class BadgesController {
  constructor(private readonly badges: BadgesService) {}

  @Public()
  @Get('badges')
  @ApiOperation({
    operationId: 'Badges_list',
    summary:
      'The 64-badge catalogue with live progress; guests see the catalogue without progress',
  })
  @ApiOkResponse({ type: BadgesListDto })
  @ApiErrorResponses({ 403: ['ACCOUNT_BLOCKED'] })
  list(@OptionalUser() user: AuthUser | undefined): Promise<BadgesListDto> {
    return user ? this.badges.listMine(user.id) : Promise.resolve(this.badges.listGuest());
  }

  @ApiBearerAuth()
  @Put('me/badges/showcase')
  @ApiOperation({
    operationId: 'Me_setBadgesShowcase',
    summary: 'Pick up to four earned badges for the profile showcase',
  })
  @ApiOkResponse({ type: BadgesListDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED', 'BADGE_NOT_EARNED'],
    401: ['UNAUTHENTICATED'],
    403: ['ACCOUNT_BLOCKED'],
  })
  setShowcase(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetShowcaseDto,
  ): Promise<BadgesListDto> {
    return this.badges.setShowcase(user.id, dto.keys);
  }

  @Public()
  @Throttled('lookup')
  @Get('users/:username/badges')
  @ApiOperation({
    operationId: 'Users_getBadges',
    summary: "A public profile's showcase badges",
  })
  @ApiOkResponse({ type: PublicBadgesDto })
  @ApiErrorResponses({ 404: ['PROFILE_NOT_FOUND'], 429: ['RATE_LIMITED'] })
  publicShowcase(@Param('username') username: string): Promise<PublicBadgesDto> {
    return this.badges.publicShowcase(username);
  }
}

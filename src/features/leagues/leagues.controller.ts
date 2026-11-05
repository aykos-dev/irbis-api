import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
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
import {
  CurrentLeagueDto,
  LeagueResultSeenDto,
  PublicLeagueDto,
} from './dto/leagues.response.dto.js';
import { LeaguesService } from './leagues.service.js';

@ApiTags('Leagues')
@Controller()
export class LeaguesController {
  constructor(private readonly leagues: LeaguesService) {}

  @ApiBearerAuth()
  @Get('leagues/current')
  @ApiOperation({
    operationId: 'Leagues_current',
    summary: 'Current seasonal league, division and pending result',
  })
  @ApiOkResponse({ type: CurrentLeagueDto })
  @ApiErrorResponses({ 401: ['UNAUTHENTICATED'], 403: ['ACCOUNT_BLOCKED'] })
  current(@CurrentUser() user: AuthUser): Promise<CurrentLeagueDto> {
    return this.leagues.current(user.id);
  }

  @ApiBearerAuth()
  @Post('me/league-result/seen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'Me_seenLeagueResult',
    summary: 'Mark the latest seasonal league result seen',
  })
  @ApiOkResponse({ type: LeagueResultSeenDto })
  @ApiErrorResponses({ 401: ['UNAUTHENTICATED'], 403: ['ACCOUNT_BLOCKED'] })
  seen(@CurrentUser() user: AuthUser): Promise<LeagueResultSeenDto> {
    return this.leagues.markResultSeen(user.id);
  }

  @Public()
  @Throttled('lookup')
  @Get('users/:username/league')
  @ApiOperation({
    operationId: 'Users_getLeague',
    summary: "A public profile's latest league result",
  })
  @ApiOkResponse({ type: PublicLeagueDto })
  @ApiErrorResponses({ 404: ['PROFILE_NOT_FOUND'], 429: ['RATE_LIMITED'] })
  publicSummary(@Param('username') username: string): Promise<PublicLeagueDto> {
    return this.leagues.publicSummary(username);
  }
}

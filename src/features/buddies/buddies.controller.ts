import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Throttled } from '../../common/decorators/throttle.decorator.js';
import { uuidPipe } from '../trip-events/trip-events.controller.js';
import {
  AvailabilityInputDto,
  BuddyRequestInputDto,
  FindBuddiesQueryDto,
  TripRatingInputDto,
} from './dto/buddies.request.dto.js';
import {
  AvailabilityDto,
  BuddiesListDto,
  BuddyCandidatePageDto,
  BuddyLinkDto,
  BuddySummaryDto,
  BuddyTripsDto,
  MyPendingRatingsDto,
  TripRatingsPendingDto,
} from './dto/buddies.response.dto.js';
import { BuddiesService } from './buddies.service.js';

const SIGNED_IN = {
  400: ['VALIDATION_FAILED'],
  401: ['UNAUTHENTICATED'],
  403: ['ACCOUNT_BLOCKED'],
} as const;

@ApiTags('Buddies')
@ApiBearerAuth()
@Controller('buddies')
export class BuddiesController {
  constructor(private readonly buddies: BuddiesService) {}

  @Get('find')
  @ApiOperation({
    operationId: 'Buddies_find',
    summary:
      'Find buddies: active, public, findable people you are not linked to',
  })
  @ApiOkResponse({ type: BuddyCandidatePageDto })
  @ApiErrorResponses(SIGNED_IN)
  find(
    @CurrentUser() user: AuthUser,
    @Query() query: FindBuddiesQueryDto,
  ): Promise<BuddyCandidatePageDto> {
    return this.buddies.find(user.id, query);
  }

  @Get()
  @ApiOperation({
    operationId: 'Buddies_list',
    summary: 'My buddies and pending requests both ways',
  })
  @ApiOkResponse({ type: BuddiesListDto })
  @ApiErrorResponses(SIGNED_IN)
  list(@CurrentUser() user: AuthUser): Promise<BuddiesListDto> {
    return this.buddies.list(user.id);
  }

  @Get('trips')
  @ApiOperation({
    operationId: 'Buddies_trips',
    summary: 'Upcoming public group trips my buddies are going on (max 10)',
  })
  @ApiOkResponse({ type: BuddyTripsDto })
  @ApiErrorResponses(SIGNED_IN)
  trips(@CurrentUser() user: AuthUser): Promise<BuddyTripsDto> {
    return this.buddies.trips(user.id);
  }

  @Post('requests')
  @ApiOperation({
    operationId: 'Buddies_request',
    summary: 'Send a buddy request (accepts theirs if they already asked you)',
  })
  @ApiCreatedResponse({ type: BuddyLinkDto })
  @ApiOkResponse({
    type: BuddyLinkDto,
    description: 'They had already asked you: the link is now accepted.',
  })
  @ApiErrorResponses({
    ...SIGNED_IN,
    403: ['SECURED_ACCOUNT_REQUIRED', 'ACCOUNT_BLOCKED'],
    404: ['BUDDY_USER_NOT_FOUND'],
    409: ['BUDDY_EXISTS'],
  })
  async request(
    @CurrentUser() user: AuthUser,
    @Body() dto: BuddyRequestInputDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BuddyLinkDto> {
    const { link, created } = await this.buddies.request(user.id, dto.userId);
    if (!created) res.status(HttpStatus.OK);
    return link;
  }

  @Post('requests/:id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'Buddies_accept',
    summary: 'Accept a buddy request sent to me',
  })
  @ApiOkResponse({ type: BuddyLinkDto })
  @ApiErrorResponses({ ...SIGNED_IN, 404: ['BUDDY_REQUEST_NOT_FOUND'] })
  accept(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe('id')) id: string,
  ): Promise<BuddyLinkDto> {
    return this.buddies.accept(user.id, id);
  }

  @Post('requests/:id/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'Buddies_decline',
    summary: 'Decline a buddy request sent to me',
  })
  @ApiNoContentResponse()
  @ApiErrorResponses({ ...SIGNED_IN, 404: ['BUDDY_REQUEST_NOT_FOUND'] })
  decline(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe('id')) id: string,
  ): Promise<void> {
    return this.buddies.decline(user.id, id);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'Buddies_remove',
    summary: 'Remove a buddy or cancel my outgoing request',
  })
  @ApiNoContentResponse()
  @ApiErrorResponses({ ...SIGNED_IN, 404: ['BUDDY_NOT_FOUND'] })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('userId', uuidPipe('userId')) userId: string,
  ): Promise<void> {
    return this.buddies.remove(user.id, userId);
  }
}

@ApiTags('Buddies')
@ApiBearerAuth()
@Controller('me')
export class BuddiesMeController {
  constructor(private readonly buddies: BuddiesService) {}

  @Get('availability')
  @ApiOperation({
    operationId: 'Me_getAvailability',
    summary: "I'm free Sat / Sun for the current Asia/Tashkent week",
  })
  @ApiOkResponse({ type: AvailabilityDto })
  @ApiErrorResponses(SIGNED_IN)
  getAvailability(@CurrentUser() user: AuthUser): Promise<AvailabilityDto> {
    return this.buddies.getAvailability(user.id);
  }

  @Put('availability')
  @ApiOperation({
    operationId: 'Me_putAvailability',
    summary: "Set I'm free Sat / Sun for the current Asia/Tashkent week",
  })
  @ApiOkResponse({ type: AvailabilityDto })
  @ApiErrorResponses(SIGNED_IN)
  putAvailability(
    @CurrentUser() user: AuthUser,
    @Body() dto: AvailabilityInputDto,
  ): Promise<AvailabilityDto> {
    return this.buddies.putAvailability(user.id, dto);
  }

  @Get('buddy-summary')
  @ApiOperation({
    operationId: 'Me_buddySummary',
    summary: 'My buddy count and trip-buddy ratings',
  })
  @ApiOkResponse({ type: BuddySummaryDto })
  @ApiErrorResponses(SIGNED_IN)
  summary(@CurrentUser() user: AuthUser): Promise<BuddySummaryDto> {
    return this.buddies.profileSummary(user.id);
  }

  @Get('ratings/pending')
  @ApiOperation({
    operationId: 'Me_pendingRatings',
    summary: 'Trips I attended where I can still rate someone (Home card)',
  })
  @ApiOkResponse({ type: MyPendingRatingsDto })
  @ApiErrorResponses(SIGNED_IN)
  pendingRatings(@CurrentUser() user: AuthUser): Promise<MyPendingRatingsDto> {
    return this.buddies.myPending(user.id);
  }
}

@ApiTags('Group trips')
@ApiBearerAuth()
@Controller('group-trips')
export class TripRatingsController {
  constructor(private readonly buddies: BuddiesService) {}

  @Get(':id/ratings/pending')
  @ApiOperation({
    operationId: 'GroupTrips_pendingRatings',
    summary: 'Other attendees of this trip with my own scores so far',
  })
  @ApiOkResponse({ type: TripRatingsPendingDto })
  @ApiErrorResponses({
    ...SIGNED_IN,
    403: ['NOT_ATTENDEE', 'ACCOUNT_BLOCKED'],
    404: ['GROUP_TRIP_NOT_FOUND'],
  })
  pending(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe('id')) id: string,
  ): Promise<TripRatingsPendingDto> {
    return this.buddies.pendingForTrip(user.id, id);
  }

  @Put(':id/ratings/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'GroupTrips_rate',
    summary: 'Rate another attendee 1-5 per trait (until 7 days after backBy)',
  })
  @ApiNoContentResponse()
  @ApiErrorResponses({
    ...SIGNED_IN,
    403: ['NOT_ATTENDEE', 'ACCOUNT_BLOCKED'],
    404: ['GROUP_TRIP_NOT_FOUND'],
    409: ['RATING_CLOSED'],
    422: ['RATING_SELF'],
  })
  rate(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe('id')) id: string,
    @Param('userId', uuidPipe('userId')) userId: string,
    @Body() dto: TripRatingInputDto,
  ): Promise<void> {
    return this.buddies.rate(user.id, id, userId, dto);
  }
}

@ApiTags('Profile')
@Controller('users')
export class BuddySummaryController {
  constructor(private readonly buddies: BuddiesService) {}

  @Public()
  @Throttled('lookup')
  @Get(':username/buddy-summary')
  @ApiOperation({
    operationId: 'Users_getBuddySummary',
    summary: "A public profile's buddy count and trip-buddy ratings",
  })
  @ApiOkResponse({ type: BuddySummaryDto })
  @ApiErrorResponses({ 404: ['PROFILE_NOT_FOUND'], 429: ['RATE_LIMITED'] })
  summary(@Param('username') username: string): Promise<BuddySummaryDto> {
    return this.buddies.publicSummary(username);
  }
}

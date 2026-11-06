import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import {
  CurrentUser,
  OptionalUser,
} from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import {
  CreateGroupTripDto,
  GroupTripsQueryDto,
  JoinGroupTripDto,
  UpdateGroupTripDto,
} from './dto/trip-events.request.dto.js';
import {
  GroupTripDto,
  GroupTripsPageDto,
} from './dto/trip-events.response.dto.js';
import { TripEventsService } from './trip-events.service.js';

/** Non-uuid ids answer 400 VALIDATION_FAILED like every other bad input. */
export function uuidPipe(field: string): ParseUUIDPipe {
  return new ParseUUIDPipe({
    exceptionFactory: () => new RequestValidationError({ [field]: ['isUuid'] }),
  });
}

const SIGNED_IN_ERRORS = {
  400: ['VALIDATION_FAILED'],
  401: ['UNAUTHENTICATED'],
} as const;

@ApiTags('Group trips')
@Controller('group-trips')
export class TripEventsController {
  constructor(private readonly trips: TripEventsService) {}

  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    operationId: 'GroupTrips_create',
    summary: 'Create a group trip as a group owner or admin',
  })
  @ApiCreatedResponse({ type: GroupTripDto })
  @ApiErrorResponses({
    ...SIGNED_IN_ERRORS,
    403: [
      'SECURED_ACCOUNT_REQUIRED',
      'TRIP_LEADER_REQUIRED',
      'GROUP_LINK_FORBIDDEN',
      'ACCOUNT_BLOCKED',
    ],
    404: ['PLACE_NOT_FOUND'],
    422: ['GROUP_TRIP_INVALID', 'EMERGENCY_CONTACT_REQUIRED'],
  })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateGroupTripDto,
  ): Promise<GroupTripDto> {
    return this.trips.create(user.id, dto);
  }

  @Public()
  @Get()
  @ApiOperation({
    operationId: 'GroupTrips_list',
    summary: 'Upcoming group trips you can see, or your own (scope=mine)',
  })
  @ApiOkResponse({ type: GroupTripsPageDto })
  @ApiErrorResponses({ 400: ['VALIDATION_FAILED'] })
  list(
    @Query() query: GroupTripsQueryDto,
    @OptionalUser() user?: AuthUser,
  ): Promise<GroupTripsPageDto> {
    return this.trips.list(query, user?.id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    operationId: 'GroupTrips_get',
    summary: 'A group trip with participants (and requests for its leader)',
  })
  @ApiOkResponse({ type: GroupTripDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    404: ['GROUP_TRIP_NOT_FOUND'],
  })
  get(
    @Param('id', uuidPipe('id')) id: string,
    @OptionalUser() user?: AuthUser,
  ): Promise<GroupTripDto> {
    return this.trips.details(id, user?.id);
  }

  @ApiBearerAuth()
  @Post(':id/requests')
  @ApiOperation({
    operationId: 'GroupTrips_request',
    summary: 'Ask to join a group trip',
  })
  @ApiCreatedResponse({ type: GroupTripDto })
  @ApiErrorResponses({
    ...SIGNED_IN_ERRORS,
    403: ['SECURED_ACCOUNT_REQUIRED', 'ACCOUNT_BLOCKED'],
    404: ['GROUP_TRIP_NOT_FOUND'],
    409: ['GROUP_TRIP_CLOSED', 'GROUP_TRIP_FULL', 'ALREADY_REQUESTED'],
    422: ['EMERGENCY_CONTACT_REQUIRED'],
  })
  request(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe('id')) id: string,
    @Body() dto: JoinGroupTripDto,
  ): Promise<GroupTripDto> {
    return this.trips.request(user.id, id, dto);
  }

  @ApiBearerAuth()
  @Post(':id/requests/:userId/approve')
  @ApiOperation({
    operationId: 'GroupTrips_approveRequest',
    summary: 'Approve a join request as the trip leader',
  })
  @ApiCreatedResponse({ type: GroupTripDto })
  @ApiErrorResponses({
    ...SIGNED_IN_ERRORS,
    403: ['TRIP_LEADER_REQUIRED', 'ACCOUNT_BLOCKED'],
    404: ['GROUP_TRIP_NOT_FOUND', 'GROUP_TRIP_REQUEST_NOT_FOUND'],
    409: ['GROUP_TRIP_CLOSED', 'GROUP_TRIP_FULL'],
    422: ['EMERGENCY_CONTACT_REQUIRED'],
  })
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe('id')) id: string,
    @Param('userId', uuidPipe('userId')) userId: string,
  ): Promise<GroupTripDto> {
    return this.trips.approve(user.id, id, userId);
  }

  @ApiBearerAuth()
  @Post(':id/requests/:userId/reject')
  @ApiOperation({
    operationId: 'GroupTrips_rejectRequest',
    summary: 'Reject a join request as the trip leader',
  })
  @ApiCreatedResponse({ type: GroupTripDto })
  @ApiErrorResponses({
    ...SIGNED_IN_ERRORS,
    403: ['TRIP_LEADER_REQUIRED', 'ACCOUNT_BLOCKED'],
    404: ['GROUP_TRIP_NOT_FOUND', 'GROUP_TRIP_REQUEST_NOT_FOUND'],
  })
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe('id')) id: string,
    @Param('userId', uuidPipe('userId')) userId: string,
  ): Promise<GroupTripDto> {
    return this.trips.reject(user.id, id, userId);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    operationId: 'GroupTrips_update',
    summary: 'Edit a group trip as its leader (until its start day)',
  })
  @ApiOkResponse({ type: GroupTripDto })
  @ApiErrorResponses({
    ...SIGNED_IN_ERRORS,
    403: ['TRIP_LEADER_REQUIRED', 'GROUP_LINK_FORBIDDEN', 'ACCOUNT_BLOCKED'],
    404: ['GROUP_TRIP_NOT_FOUND', 'PLACE_NOT_FOUND'],
    409: ['GROUP_TRIP_CLOSED', 'GROUP_TRIP_LOCKED'],
    422: ['GROUP_TRIP_INVALID'],
  })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe('id')) id: string,
    @Body() dto: UpdateGroupTripDto,
  ): Promise<GroupTripDto> {
    return this.trips.update(user.id, id, dto);
  }

  @ApiBearerAuth()
  @Post(':id/cancel')
  @ApiOperation({
    operationId: 'GroupTrips_cancel',
    summary: 'Cancel a group trip as its leader',
  })
  @ApiCreatedResponse({ type: GroupTripDto })
  @ApiErrorResponses({
    ...SIGNED_IN_ERRORS,
    403: ['TRIP_LEADER_REQUIRED', 'ACCOUNT_BLOCKED'],
    404: ['GROUP_TRIP_NOT_FOUND'],
    409: ['GROUP_TRIP_CLOSED'],
  })
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe('id')) id: string,
  ): Promise<GroupTripDto> {
    return this.trips.cancel(user.id, id);
  }

  @ApiBearerAuth()
  @Post(':id/leave')
  @ApiOperation({
    operationId: 'GroupTrips_leave',
    summary: 'Leave a group trip (or withdraw a request)',
  })
  @ApiCreatedResponse({ type: GroupTripDto })
  @ApiErrorResponses({
    ...SIGNED_IN_ERRORS,
    403: ['ACCOUNT_BLOCKED'],
    404: ['GROUP_TRIP_NOT_FOUND', 'NOT_ON_GROUP_TRIP'],
    409: ['LEADER_CANNOT_LEAVE'],
  })
  leave(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe('id')) id: string,
  ): Promise<GroupTripDto> {
    return this.trips.leave(user.id, id);
  }
}

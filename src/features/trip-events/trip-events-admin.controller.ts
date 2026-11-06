import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  AdminCancelGroupTripDto,
  AdminGroupTripsQueryDto,
} from './dto/trip-events.request.dto.js';
import {
  AdminGroupTripsPageDto,
  GroupTripDto,
} from './dto/trip-events.response.dto.js';
import { uuidPipe } from './trip-events.controller.js';
import { TripEventsService } from './trip-events.service.js';

const ADMIN_ERRORS = {
  401: ['UNAUTHENTICATED'],
  403: ['FORBIDDEN', 'ACCOUNT_BLOCKED'],
};

/** Admin panel: group trip moderation. */
@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/group-trips')
export class TripEventsAdminController {
  constructor(private readonly trips: TripEventsService) {}

  @Get()
  @ApiOperation({
    operationId: 'Admin_listGroupTrips',
    summary: 'Group trips, newest start first',
  })
  @ApiOkResponse({ type: AdminGroupTripsPageDto })
  @ApiErrorResponses({ ...ADMIN_ERRORS, 400: ['VALIDATION_FAILED'] })
  list(
    @Query() query: AdminGroupTripsQueryDto,
  ): Promise<AdminGroupTripsPageDto> {
    return this.trips.adminList(query);
  }

  @Post(':id/cancel')
  @ApiOperation({
    operationId: 'Admin_cancelGroupTrip',
    summary: 'Cancel a group trip (audited)',
  })
  @ApiCreatedResponse({ type: GroupTripDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['GROUP_TRIP_NOT_FOUND'],
    409: ['GROUP_TRIP_CLOSED'],
  })
  cancel(
    @CurrentUser() admin: AuthUser,
    @Param('id', uuidPipe('id')) id: string,
    @Body() dto: AdminCancelGroupTripDto,
  ): Promise<GroupTripDto> {
    return this.trips.adminCancel(admin.id, id, dto.note);
  }
}

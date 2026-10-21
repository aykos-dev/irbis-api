import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { RequestValidationError } from '../../common/errors/validation.error.js';
import {
  CheckOutTripDto,
  CreateTripDto,
  PostTripLocationDto,
  PutEmergencyContactDto,
  StartTripDto,
  TripPreviewQueryDto,
  UpdateTripDto,
} from './dto/trip-plan.request.dto.js';
import {
  CurrentTripsDto,
  EmergencyContactDto,
  TripDto,
  TripPreviewDto,
} from './dto/trip-plan.response.dto.js';
import { TripActiveService } from './trip-active.service.js';
import { TripPlanService } from './trip-plan.service.js';

/** Non-uuid ids answer 400 VALIDATION_FAILED like every other bad input. */
function uuidPipe(): ParseUUIDPipe {
  return new ParseUUIDPipe({
    exceptionFactory: () => new RequestValidationError({ id: ['isUuid'] }),
  });
}

const SIGNED_IN_ERRORS = {
  401: ['UNAUTHENTICATED'],
  403: ['ACCOUNT_BLOCKED'],
} as const;

@ApiTags('Trips')
@ApiBearerAuth()
@Controller('places')
export class TripPreviewController {
  constructor(private readonly trips: TripPlanService) {}

  @Get(':id/trip-preview')
  @ApiOperation({
    operationId: 'getTripPreview',
    summary: 'Sunset, daylight buffer and gear list for a planned window',
  })
  @ApiOkResponse({ type: TripPreviewDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    ...SIGNED_IN_ERRORS,
    404: ['PLACE_NOT_FOUND'],
    422: ['TRIP_TIMES_INVALID'],
  })
  preview(
    @Param('id', uuidPipe()) id: string,
    @Query() query: TripPreviewQueryDto,
  ): Promise<TripPreviewDto> {
    return this.trips.preview(
      id,
      new Date(query.startAt),
      new Date(query.backBy),
    );
  }
}

@ApiTags('Me')
@ApiBearerAuth()
@Controller('me/emergency-contact')
export class EmergencyContactController {
  constructor(private readonly trips: TripPlanService) {}

  @Get()
  @ApiOperation({
    operationId: 'getEmergencyContact',
    summary: 'The saved emergency contact (phone masked); 204 when none',
  })
  @ApiOkResponse({ type: EmergencyContactDto })
  @ApiNoContentResponse({ description: 'No contact saved yet.' })
  @ApiErrorResponses(SIGNED_IN_ERRORS)
  async get(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<EmergencyContactDto | undefined> {
    const contact = await this.trips.getEmergencyContact(user.id);
    if (contact) return contact;
    res.status(HttpStatus.NO_CONTENT);
    return undefined;
  }

  @Put()
  @ApiOperation({
    operationId: 'putEmergencyContact',
    summary: 'Save or replace the emergency contact (phone stored encrypted)',
  })
  @ApiOkResponse({ type: EmergencyContactDto })
  @ApiErrorResponses({ 400: ['VALIDATION_FAILED'], ...SIGNED_IN_ERRORS })
  put(
    @CurrentUser() user: AuthUser,
    @Body() dto: PutEmergencyContactDto,
  ): Promise<EmergencyContactDto> {
    return this.trips.putEmergencyContact(user.id, dto);
  }
}

@ApiTags('Trips')
@ApiBearerAuth()
@Controller('trips')
export class TripsController {
  constructor(
    private readonly trips: TripPlanService,
    private readonly active: TripActiveService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    operationId: 'createTrip',
    summary: 'Plan a trip, or start it now with `start: true`',
    description:
      'Snapshots the emergency contact. `location` is stored only when `start` is true.',
  })
  @ApiCreatedResponse({ type: TripDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    ...SIGNED_IN_ERRORS,
    404: ['PLACE_NOT_FOUND'],
    409: ['TRIP_ALREADY_ACTIVE'],
    422: ['TRIP_TIMES_INVALID', 'EMERGENCY_CONTACT_REQUIRED'],
  })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTripDto,
  ): Promise<TripDto> {
    return this.active.present(await this.trips.create(user.id, dto));
  }

  @Get('current')
  @ApiOperation({
    operationId: 'getCurrentTrips',
    summary: "The user's active trip and upcoming planned trips",
  })
  @ApiOkResponse({ type: CurrentTripsDto })
  @ApiErrorResponses(SIGNED_IN_ERRORS)
  async current(@CurrentUser() user: AuthUser): Promise<CurrentTripsDto> {
    return this.active.presentCurrent(await this.trips.current(user.id));
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'startTrip',
    summary: 'Start a planned trip now (optional device location)',
  })
  @ApiOkResponse({ type: TripDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    ...SIGNED_IN_ERRORS,
    404: ['TRIP_NOT_FOUND'],
    409: ['TRIP_NOT_EDITABLE', 'TRIP_ALREADY_ACTIVE'],
    422: ['TRIP_TIMES_INVALID'],
  })
  async start(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe()) id: string,
    @Body() dto: StartTripDto,
  ): Promise<TripDto> {
    return this.active.present(await this.trips.start(user.id, id, dto));
  }

  @Post(':id/locations')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'tripsPostLocation',
    summary: 'Send the current location and running totals of an active trip',
    description:
      'Active or alerted trips only. A fix older than the stored one is ignored (still 204).',
  })
  @ApiNoContentResponse({ description: 'Stored or ignored as stale.' })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    ...SIGNED_IN_ERRORS,
    404: ['TRIP_NOT_FOUND'],
    409: ['TRIP_NOT_ACTIVE'],
  })
  postLocation(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe()) id: string,
    @Body() dto: PostTripLocationDto,
  ): Promise<void> {
    return this.active.postLocation(user.id, id, dto);
  }

  @Patch(':id')
  @ApiOperation({
    operationId: 'updateTrip',
    summary: 'Edit a planned trip, or extend/toggle the alert of an active one',
    description:
      'Planned: startAt, backBy, alertEnabled. Active (until the alert is sent): backBy and alertEnabled only.',
  })
  @ApiOkResponse({ type: TripDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    ...SIGNED_IN_ERRORS,
    404: ['TRIP_NOT_FOUND'],
    409: ['TRIP_NOT_EDITABLE'],
    422: ['TRIP_TIMES_INVALID'],
  })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe()) id: string,
    @Body() dto: UpdateTripDto,
  ): Promise<TripDto> {
    return this.active.present(await this.trips.update(user.id, id, dto));
  }

  @Post(':id/check-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'checkOutTrip',
    summary: 'Mark an active or alerted trip as safely back',
    description: 'Optional final distanceM / climbM totals are stored.',
  })
  @ApiOkResponse({ type: TripDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    ...SIGNED_IN_ERRORS,
    404: ['TRIP_NOT_FOUND'],
    409: ['TRIP_NOT_EDITABLE'],
  })
  async checkOut(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe()) id: string,
    @Body() dto: CheckOutTripDto,
  ): Promise<TripDto> {
    return this.active.present(await this.trips.checkOut(user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'deleteTrip',
    summary: 'Delete a planned trip',
  })
  @ApiNoContentResponse({ description: 'Deleted.' })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    ...SIGNED_IN_ERRORS,
    404: ['TRIP_NOT_FOUND'],
    409: ['TRIP_NOT_EDITABLE'],
  })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe()) id: string,
  ): Promise<void> {
    return this.trips.remove(user.id, id);
  }
}

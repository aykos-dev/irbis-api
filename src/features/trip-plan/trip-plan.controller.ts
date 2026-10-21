import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
  CreateTripDto,
  PutEmergencyContactDto,
  TripPreviewQueryDto,
} from './dto/trip-plan.request.dto.js';
import {
  CurrentTripsDto,
  EmergencyContactDto,
  TripDto,
  TripPreviewDto,
} from './dto/trip-plan.response.dto.js';
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
  constructor(private readonly trips: TripPlanService) {}

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
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTripDto,
  ): Promise<TripDto> {
    return this.trips.create(user.id, dto);
  }

  @Get('current')
  @ApiOperation({
    operationId: 'getCurrentTrips',
    summary: "The user's active trip and upcoming planned trips",
  })
  @ApiOkResponse({ type: CurrentTripsDto })
  @ApiErrorResponses(SIGNED_IN_ERRORS)
  current(@CurrentUser() user: AuthUser): Promise<CurrentTripsDto> {
    return this.trips.current(user.id);
  }
}

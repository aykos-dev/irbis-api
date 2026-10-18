import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
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
import { AdminConditionsService } from './admin-conditions.service.js';
import {
  AdminConditionsQueryDto,
  CreateClosureDto,
  CreateOverrideDto,
  IdParamDto,
  type ReasonInputDto,
} from './dto/conditions.request.dto.js';
import {
  AdminConditionListResponseDto,
  ClosureDto,
  ConditionControlsDto,
  OverrideDto,
  RecomputeStartedDto,
} from './dto/conditions.response.dto.js';
import type { LocalizedText } from './conditions.repository.js';

const ADMIN_ERRORS = {
  401: ['UNAUTHENTICATED'],
  403: ['FORBIDDEN', 'ACCOUNT_BLOCKED'],
};

const text = (reason: ReasonInputDto): LocalizedText => ({
  uz: reason.uz,
  ru: reason.ru ?? null,
  en: reason.en ?? null,
});

/** Admin conditions: status list, closures, overrides, manual recompute. */
@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminConditionsController {
  constructor(private readonly admin: AdminConditionsService) {}

  @Get('conditions')
  @ApiOperation({
    operationId: 'Admin_listConditions',
    summary: 'Every place with its condition, by name',
  })
  @ApiOkResponse({ type: AdminConditionListResponseDto })
  @ApiErrorResponses({ ...ADMIN_ERRORS, 400: ['VALIDATION_FAILED'] })
  list(
    @Query() query: AdminConditionsQueryDto,
  ): Promise<AdminConditionListResponseDto> {
    return this.admin.list(query);
  }

  @Post('conditions/recompute')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    operationId: 'Admin_recomputeConditions',
    summary: 'Fetch forecasts and recompute every place, in the background',
  })
  @ApiAcceptedResponse({ type: RecomputeStartedDto })
  @ApiErrorResponses({ ...ADMIN_ERRORS, 409: ['RECOMPUTE_RUNNING'] })
  recompute(): RecomputeStartedDto {
    return this.admin.startRecompute();
  }

  @Get('places/:id/condition-controls')
  @ApiOperation({
    operationId: 'Admin_getConditionControls',
    summary: "A place's condition with its closures and overrides",
  })
  @ApiOkResponse({ type: ConditionControlsDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['PLACE_NOT_FOUND'],
  })
  controls(@Param() { id }: IdParamDto): Promise<ConditionControlsDto> {
    return this.admin.controls(id);
  }

  @Post('places/:id/closures')
  @ApiOperation({
    operationId: 'Admin_createClosure',
    summary: 'Close a place',
  })
  @ApiCreatedResponse({ type: ClosureDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['PLACE_NOT_FOUND'],
  })
  createClosure(
    @CurrentUser() user: AuthUser,
    @Param() { id }: IdParamDto,
    @Body() dto: CreateClosureDto,
  ): Promise<ClosureDto> {
    return this.admin.createClosure(user.id, id, {
      startsAt: new Date(dto.startsAt),
      endsAt: dto.endsAt === undefined ? null : new Date(dto.endsAt),
      reason: text(dto.reason),
      source: dto.source,
    });
  }

  @Post('closures/:id/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'Admin_endClosure', summary: 'End a closure' })
  @ApiOkResponse({ type: ClosureDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['CLOSURE_NOT_FOUND'],
    409: ['CLOSURE_ALREADY_ENDED'],
  })
  endClosure(
    @CurrentUser() user: AuthUser,
    @Param() { id }: IdParamDto,
  ): Promise<ClosureDto> {
    return this.admin.endClosure(user.id, id);
  }

  @Post('places/:id/overrides')
  @ApiOperation({
    operationId: 'Admin_createOverride',
    summary: "Override a place's status (ends the current override)",
  })
  @ApiCreatedResponse({ type: OverrideDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['PLACE_NOT_FOUND'],
  })
  createOverride(
    @CurrentUser() user: AuthUser,
    @Param() { id }: IdParamDto,
    @Body() dto: CreateOverrideDto,
  ): Promise<OverrideDto> {
    return this.admin.createOverride(user.id, id, {
      status: dto.status,
      reason: text(dto.reason),
      expiresAt: new Date(dto.expiresAt),
    });
  }

  @Post('overrides/:id/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'Admin_endOverride',
    summary: 'End an override',
  })
  @ApiOkResponse({ type: OverrideDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['OVERRIDE_NOT_FOUND'],
    409: ['OVERRIDE_ALREADY_ENDED'],
  })
  endOverride(
    @CurrentUser() user: AuthUser,
    @Param() { id }: IdParamDto,
  ): Promise<OverrideDto> {
    return this.admin.endOverride(user.id, id);
  }
}

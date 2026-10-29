import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { CreateCheckInDto } from './dto/check-in.request.dto.js';
import { CheckInResultDto } from './dto/check-in.response.dto.js';
import { CheckInService } from './check-in.service.js';

@ApiTags('Check-ins')
@ApiBearerAuth()
@Controller('check-ins')
export class CheckInController {
  constructor(private readonly checkIns: CheckInService) {}

  @Post()
  @ApiOperation({
    operationId: 'checkInsCreate',
    summary:
      'Check in at a place with a GPS fix (earns XP once per place per month)',
    description:
      'Rules in order: recordedAt (future → 400, older than 72 h → 422), place, accuracy, radius of the place type. A repeat at the same place in the same Asia/Tashkent month is stored with counted=false and 0 XP.',
  })
  @ApiCreatedResponse({ type: CheckInResultDto })
  @ApiOkResponse({
    type: CheckInResultDto,
    description:
      'This clientId was already stored: its result is returned again (no new XP).',
  })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    401: ['UNAUTHENTICATED'],
    403: ['ACCOUNT_BLOCKED'],
    404: ['PLACE_NOT_FOUND'],
    422: ['CHECK_IN_TOO_OLD', 'LOCATION_INACCURATE', 'CHECK_IN_TOO_FAR'],
  })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCheckInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CheckInResultDto> {
    const { result, created } = await this.checkIns.create(user.id, dto);
    if (!created) res.status(HttpStatus.OK);
    return result;
  }
}

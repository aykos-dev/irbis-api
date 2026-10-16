import {
  Controller,
  Get,
  HttpStatus,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { HealthResponseDto, HealthStatus } from './dto/health.response.dto.js';
import { HealthService } from './health.service.js';

@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({
    operationId: 'Health_check',
    summary: 'API and database reachability',
  })
  @ApiOkResponse({
    type: HealthResponseDto,
    description: 'API and database are up.',
  })
  @ApiServiceUnavailableResponse({
    type: HealthResponseDto,
    description:
      'Database unreachable or slower than 3 s; same body with status "degraded".',
  })
  async check(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthResponseDto> {
    const result = await this.health.check();
    res.status(
      result.status === HealthStatus.Ok
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE,
    );
    return result;
  }
}

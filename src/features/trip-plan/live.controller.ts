import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Throttled } from '../../common/decorators/throttle.decorator.js';
import { LiveTripDto } from './dto/trip-plan.response.dto.js';
import { TripActiveService } from './trip-active.service.js';

/** AC5: the public live page a trip's emergency contact opens from the shared link. */
@ApiTags('Live')
@Controller('live')
export class LiveController {
  constructor(private readonly active: TripActiveService) {}

  // Public by spec (active-trip AC5): the unguessable token is the access; 30 req/min/IP (lookup tier).
  @Public()
  @Throttled('lookup')
  @Get(':token')
  @ApiOperation({
    operationId: 'liveGet',
    summary: 'Public live view of a trip by its live-link token',
  })
  @ApiOkResponse({ type: LiveTripDto })
  @ApiErrorResponses({ 404: ['LIVE_NOT_FOUND'], 429: ['RATE_LIMITED'] })
  get(@Param('token') token: string): Promise<LiveTripDto> {
    return this.active.live(token);
  }
}

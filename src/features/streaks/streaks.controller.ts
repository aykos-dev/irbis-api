import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { StreaksDto } from './dto/streaks.response.dto.js';
import { StreaksService } from './streaks.service.js';

@ApiTags('Streaks')
@ApiBearerAuth()
@Controller('me')
export class MeStreaksController {
  constructor(private readonly streaks: StreaksService) {}

  @Get('streaks')
  @ApiOperation({
    operationId: 'meStreaks',
    summary: "The signed-in user's flame and boot streaks and freezes",
  })
  @ApiOkResponse({ type: StreaksDto })
  @ApiErrorResponses({ 401: ['UNAUTHENTICATED'], 403: ['ACCOUNT_BLOCKED'] })
  get(@CurrentUser() user: AuthUser): Promise<StreaksDto> {
    return this.streaks.getMine(user.id);
  }
}

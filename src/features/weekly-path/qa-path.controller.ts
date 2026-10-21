import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { QaToolsGuard } from '../levels/qa-tools.guard.js';
import { PathVisitDto } from './dto/weekly-path.request.dto.js';
import { PathDto } from './dto/weekly-path.response.dto.js';
import { WeeklyPathService } from './weekly-path.service.js';

@ApiTags('QA')
@ApiBearerAuth()
@UseGuards(QaToolsGuard)
@Controller('qa/path')
export class QaPathController {
  constructor(private readonly path: WeeklyPathService) {}

  @Post('visits')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'QaPath_visit',
    summary: 'QA only: mark a place visited on your path this month',
    description:
      "Builds this month's path if missing, then records the visit (no XP). Answers 404 NOT_FOUND unless QA_TOOLS_ENABLED=true.",
  })
  @ApiOkResponse({ type: PathDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    401: ['UNAUTHENTICATED'],
    403: ['ACCOUNT_BLOCKED'],
    404: ['NOT_FOUND', 'PLACE_NOT_ON_PATH'],
  })
  visit(
    @CurrentUser() user: AuthUser,
    @Body() dto: PathVisitDto,
  ): Promise<PathDto> {
    return this.path.visitForQa(user.id, dto.placeId);
  }
}

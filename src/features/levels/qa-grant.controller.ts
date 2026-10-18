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
import { QaGrantDto } from './dto/levels.request.dto.js';
import { MyLevelDto } from './dto/levels.response.dto.js';
import { LevelsService } from './levels.service.js';
import { QaToolsGuard } from './qa-tools.guard.js';

@ApiTags('QA')
@ApiBearerAuth()
@UseGuards(QaToolsGuard)
@Controller('qa/levels')
export class QaGrantController {
  constructor(private readonly levels: LevelsService) {}

  @Post('grant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'QaLevels_grant',
    summary:
      'QA only: grant XP, lessons, check-ins and verified spots to yourself',
    description: 'Answers 404 NOT_FOUND unless QA_TOOLS_ENABLED=true.',
  })
  @ApiOkResponse({ type: MyLevelDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    401: ['UNAUTHENTICATED'],
    403: ['ACCOUNT_BLOCKED'],
    404: ['NOT_FOUND'],
  })
  grant(
    @CurrentUser() user: AuthUser,
    @Body() dto: QaGrantDto,
  ): Promise<MyLevelDto> {
    return this.levels.grantForQa(user.id, dto);
  }
}

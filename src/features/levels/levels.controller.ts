import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { LevelUpIdParamDto } from './dto/levels.request.dto.js';
import { LevelListResponseDto, MyLevelDto } from './dto/levels.response.dto.js';
import { LevelsService } from './levels.service.js';

@ApiTags('Levels')
@Controller('levels')
export class LevelsController {
  constructor(private readonly levels: LevelsService) {}

  @Public()
  @Get()
  @ApiOperation({
    operationId: 'Levels_list',
    summary: 'The level table with how many places each level opens',
  })
  @ApiOkResponse({ type: LevelListResponseDto })
  list(): Promise<LevelListResponseDto> {
    return this.levels.listLevels();
  }
}

@ApiTags('Levels')
@ApiBearerAuth()
@Controller('me')
export class MeLevelController {
  constructor(private readonly levels: LevelsService) {}

  @Get('level')
  @ApiOperation({
    operationId: 'MeLevel_get',
    summary: "The signed-in user's level, next-level bars and unseen level-ups",
  })
  @ApiOkResponse({ type: MyLevelDto })
  @ApiErrorResponses({ 401: ['UNAUTHENTICATED'], 403: ['ACCOUNT_BLOCKED'] })
  get(@CurrentUser() user: AuthUser): Promise<MyLevelDto> {
    return this.levels.getMyLevel(user.id);
  }

  @Post('level-ups/:id/seen')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'MeLevel_markLevelUpSeen',
    summary: 'Mark a level-up as seen (repeating it is fine)',
  })
  @ApiNoContentResponse()
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    401: ['UNAUTHENTICATED'],
    403: ['ACCOUNT_BLOCKED'],
    404: ['LEVEL_UP_NOT_FOUND'],
  })
  markSeen(
    @CurrentUser() user: AuthUser,
    @Param() { id }: LevelUpIdParamDto,
  ): Promise<void> {
    return this.levels.markLevelUpSeen(user.id, id);
  }
}

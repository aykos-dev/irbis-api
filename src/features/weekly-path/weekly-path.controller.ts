import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import {
  CurrentUser,
  OptionalUser,
} from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { PathQueryDto } from './dto/weekly-path.request.dto.js';
import { PathChestOpenDto, PathDto } from './dto/weekly-path.response.dto.js';
import { WeeklyPathService } from './weekly-path.service.js';

@ApiTags('Path')
@Controller('path')
export class WeeklyPathController {
  constructor(private readonly path: WeeklyPathService) {}

  @Public()
  @Get()
  @ApiOperation({
    operationId: 'Path_get',
    summary: "This month's path, chest and weekend weather",
    description:
      'Public. Signed in: the stored month (picked on the first call, then frozen) and `interests` is ignored. Guest: level 1, picked from `interests`, nothing stored.',
  })
  @ApiOkResponse({ type: PathDto })
  @ApiErrorResponses({ 400: ['VALIDATION_FAILED'] })
  get(
    @Query() query: PathQueryDto,
    @OptionalUser() viewer: AuthUser | undefined,
  ): Promise<PathDto> {
    return this.path.getPath(viewer?.id, query.interests ?? []);
  }

  @Post('chest/open')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'Path_openChest',
    summary: "Open this month's chest once every node is done",
    description:
      'Awards path.config.chestXp once per month. Already opened: 200 with xp 0.',
  })
  @ApiOkResponse({ type: PathChestOpenDto })
  @ApiErrorResponses({
    401: ['UNAUTHENTICATED'],
    403: ['ACCOUNT_BLOCKED'],
    404: ['PATH_NOT_FOUND'],
    409: ['PATH_CHEST_LOCKED'],
  })
  openChest(@CurrentUser() user: AuthUser): Promise<PathChestOpenDto> {
    return this.path.openChest(user.id);
  }
}

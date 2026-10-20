import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { OptionalUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { PathQueryDto } from './dto/weekly-path.request.dto.js';
import { PathDto } from './dto/weekly-path.response.dto.js';
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
}

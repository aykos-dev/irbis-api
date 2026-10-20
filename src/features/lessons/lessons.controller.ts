import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
import { LessonsService } from './lessons.service.js';
import { CompletionInputDto } from './dto/lessons.request.dto.js';
import {
  CompletionResultDto,
  LessonCatalogDto,
  PublicLessonDto,
} from './dto/lessons.response.dto.js';

@ApiTags('lessons')
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Public()
  @Get()
  @ApiOperation({
    operationId: 'lessonsList',
    summary:
      'Lesson config, tiers with their published lessons, and progress when signed in',
  })
  @ApiOkResponse({ type: LessonCatalogDto })
  list(@OptionalUser() user: AuthUser | undefined): Promise<LessonCatalogDto> {
    return this.lessons.catalog(user?.id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    operationId: 'lessonsGet',
    summary: 'A published lesson with its questions',
  })
  @ApiOkResponse({ type: PublicLessonDto })
  @ApiErrorResponses({ 404: ['LESSON_NOT_FOUND'] })
  get(@Param('id') id: string): Promise<PublicLessonDto> {
    return this.lessons.getLesson(id);
  }
}

@ApiTags('lessons')
@ApiBearerAuth()
@Controller('me')
export class MeLessonCompletionsController {
  constructor(private readonly lessons: LessonsService) {}

  @Post('lesson-completions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'lessonsComplete',
    summary:
      'Report a finished lesson run; the first valid completion awards XP',
  })
  @ApiOkResponse({ type: CompletionResultDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED'],
    401: ['UNAUTHENTICATED'],
    403: ['ACCOUNT_BLOCKED'],
    404: ['LESSON_NOT_FOUND'],
  })
  complete(
    @CurrentUser() user: AuthUser,
    @Body() dto: CompletionInputDto,
  ): Promise<CompletionResultDto> {
    return this.lessons.complete(user.id, dto);
  }
}

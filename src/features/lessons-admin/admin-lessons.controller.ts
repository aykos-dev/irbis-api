import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { LessonRecord } from './lessons-admin.repository.js';
import { LessonsAdminService } from './lessons-admin.service.js';
import {
  CreateLessonDto,
  CreateTierDto,
  IdParamDto,
  type QuestionInputDto,
  ReorderDto,
  ReplaceLessonDto,
  UpdateTierDto,
} from './dto/lessons-admin.request.dto.js';
import {
  AdminLessonDto,
  AdminLessonSummaryListDto,
  AdminTierDto,
  AdminTierListDto,
} from './dto/lessons-admin.response.dto.js';
import type { QuestionContent } from './lesson.rules.js';

const ADMIN_ERRORS = {
  401: ['UNAUTHENTICATED'],
  403: ['FORBIDDEN', 'ACCOUNT_BLOCKED'],
};

/** `url` stays null until image storage lands (lessons-admin slice 2). */
const toLessonDto = (lesson: LessonRecord): AdminLessonDto => ({
  ...lesson,
  questions: lesson.questions.map(({ imageKey, ...q }) => ({
    ...q,
    image: imageKey === null ? null : { key: imageKey, url: null },
  })),
});

const toQuestion = (q: QuestionInputDto): QuestionContent => ({
  prompt: q.prompt,
  hint: q.hint ?? null,
  options: q.options,
  correctIndex: q.correctIndex,
  explanation: q.explanation,
  wrongExplanation: q.wrongExplanation ?? null,
  imageKey: q.image ? q.image.key : null,
});

/** Admin lesson content: tiers, lessons, questions, publish. */
@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminLessonsController {
  constructor(private readonly lessons: LessonsAdminService) {}

  // --- tiers ---

  @Get('lesson-tiers')
  @ApiOperation({
    operationId: 'Admin_listLessonTiers',
    summary: 'Every lesson tier, by order, with lesson counts',
  })
  @ApiOkResponse({ type: AdminTierListDto })
  @ApiErrorResponses(ADMIN_ERRORS)
  async listTiers(): Promise<AdminTierListDto> {
    return { items: await this.lessons.listTiers() };
  }

  @Post('lesson-tiers')
  @ApiOperation({
    operationId: 'Admin_createLessonTier',
    summary: 'Create a tier, appended last',
  })
  @ApiCreatedResponse({ type: AdminTierDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    409: ['TIER_KEY_TAKEN'],
  })
  createTier(@Body() dto: CreateTierDto): Promise<AdminTierDto> {
    return this.lessons.createTier(dto);
  }

  @Post('lesson-tiers/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'Admin_reorderLessonTiers',
    summary: 'Reorder tiers; ids must be every tier id',
  })
  @ApiOkResponse({ type: AdminTierListDto })
  @ApiErrorResponses({ ...ADMIN_ERRORS, 400: ['VALIDATION_FAILED'] })
  async reorderTiers(@Body() dto: ReorderDto): Promise<AdminTierListDto> {
    return { items: await this.lessons.reorderTiers(dto.ids) };
  }

  @Patch('lesson-tiers/:id')
  @ApiOperation({
    operationId: 'Admin_updateLessonTier',
    summary: "Change a tier's title or colour (the key never changes)",
  })
  @ApiOkResponse({ type: AdminTierDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['TIER_NOT_FOUND'],
  })
  updateTier(
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateTierDto,
  ): Promise<AdminTierDto> {
    return this.lessons.updateTier(id, dto);
  }

  @Delete('lesson-tiers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'Admin_deleteLessonTier',
    summary: 'Delete a tier without lessons',
  })
  @ApiNoContentResponse()
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['TIER_NOT_FOUND'],
    409: ['TIER_NOT_EMPTY'],
  })
  deleteTier(@Param() { id }: IdParamDto): Promise<void> {
    return this.lessons.deleteTier(id);
  }

  @Get('lesson-tiers/:id/lessons')
  @ApiOperation({
    operationId: 'Admin_listTierLessons',
    summary: "A tier's lessons, by order",
  })
  @ApiOkResponse({ type: AdminLessonSummaryListDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['TIER_NOT_FOUND'],
  })
  async listLessons(
    @Param() { id }: IdParamDto,
  ): Promise<AdminLessonSummaryListDto> {
    return { items: await this.lessons.listLessons(id) };
  }

  @Post('lesson-tiers/:id/lessons/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'Admin_reorderTierLessons',
    summary: "Reorder a tier's lessons; ids must be exactly its lessons",
  })
  @ApiOkResponse({ type: AdminLessonSummaryListDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['TIER_NOT_FOUND'],
  })
  async reorderLessons(
    @Param() { id }: IdParamDto,
    @Body() dto: ReorderDto,
  ): Promise<AdminLessonSummaryListDto> {
    return { items: await this.lessons.reorderLessons(id, dto.ids) };
  }

  // --- lessons ---

  @Post('lessons')
  @ApiOperation({
    operationId: 'Admin_createLesson',
    summary: 'Create a draft lesson, appended last in its tier',
  })
  @ApiCreatedResponse({ type: AdminLessonDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['TIER_NOT_FOUND'],
  })
  async createLesson(@Body() dto: CreateLessonDto): Promise<AdminLessonDto> {
    return toLessonDto(await this.lessons.createLesson(dto));
  }

  @Get('lessons/:id')
  @ApiOperation({
    operationId: 'Admin_getLesson',
    summary: 'A lesson with its questions',
  })
  @ApiOkResponse({ type: AdminLessonDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['LESSON_NOT_FOUND'],
  })
  async getLesson(@Param() { id }: IdParamDto): Promise<AdminLessonDto> {
    return toLessonDto(await this.lessons.getLesson(id));
  }

  @Put('lessons/:id')
  @ApiOperation({
    operationId: 'Admin_replaceLesson',
    summary:
      'Replace title, icon and all questions; a published lesson must stay publishable',
  })
  @ApiOkResponse({ type: AdminLessonDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['LESSON_NOT_FOUND'],
    422: ['LESSON_NOT_PUBLISHABLE'],
  })
  async replaceLesson(
    @Param() { id }: IdParamDto,
    @Body() dto: ReplaceLessonDto,
  ): Promise<AdminLessonDto> {
    const lesson = await this.lessons.replaceLesson(id, {
      title: dto.title,
      icon: dto.icon,
      questions: dto.questions.map(toQuestion),
    });
    return toLessonDto(lesson);
  }

  @Post('lessons/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'Admin_publishLesson',
    summary: 'Publish a lesson that passes every publish rule',
  })
  @ApiOkResponse({ type: AdminLessonDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['LESSON_NOT_FOUND'],
    422: ['LESSON_NOT_PUBLISHABLE'],
  })
  async publish(@Param() { id }: IdParamDto): Promise<AdminLessonDto> {
    return toLessonDto(await this.lessons.publish(id));
  }

  @Post('lessons/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'Admin_unpublishLesson',
    summary: 'Back to draft (publishedAt keeps the first publish time)',
  })
  @ApiOkResponse({ type: AdminLessonDto })
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['LESSON_NOT_FOUND'],
  })
  async unpublish(@Param() { id }: IdParamDto): Promise<AdminLessonDto> {
    return toLessonDto(await this.lessons.unpublish(id));
  }

  @Delete('lessons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'Admin_deleteLesson',
    summary: 'Delete a draft lesson',
  })
  @ApiNoContentResponse()
  @ApiErrorResponses({
    ...ADMIN_ERRORS,
    400: ['VALIDATION_FAILED'],
    404: ['LESSON_NOT_FOUND'],
    409: ['LESSON_PUBLISHED'],
  })
  deleteLesson(@Param() { id }: IdParamDto): Promise<void> {
    return this.lessons.deleteLesson(id);
  }
}

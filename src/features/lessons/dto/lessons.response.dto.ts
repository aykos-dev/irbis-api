import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import {
  LESSON_ICONS,
  type LessonIcon,
} from '../../lessons-admin/lessons-admin.constants.js';

@ApiSchema({ name: 'LessonText' })
export class LessonTextDto {
  @ApiProperty() uz: string;
  @ApiProperty() ru: string;
  @ApiProperty() en: string;
}

@ApiSchema({ name: 'LessonsConfig' })
export class LessonsConfigDto {
  @ApiProperty({ type: 'integer', example: 5 }) heartsPerDay: number;
  @ApiProperty({ type: 'integer', example: 10 }) xpFirst: number;
  @ApiProperty({ type: 'integer', example: 15 }) xpPerfect: number;
  @ApiProperty({ type: 'integer', example: 3 }) dailyGoal: number;
}

@ApiSchema({ name: 'CatalogLesson' })
export class CatalogLessonDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: LessonTextDto }) title: LessonTextDto;
  @ApiProperty({ enum: LESSON_ICONS, enumName: 'LessonIcon' })
  icon: LessonIcon;
  @ApiProperty({ type: 'integer' }) order: number;
  @ApiProperty({ type: 'integer' }) questionCount: number;
  @ApiProperty() updatedAt: Date;
}

@ApiSchema({ name: 'CatalogTier' })
export class CatalogTierDto {
  @ApiProperty() key: string;
  @ApiProperty({ type: LessonTextDto }) title: LessonTextDto;
  @ApiProperty({ example: '#58CC02' }) colour: string;
  @ApiProperty({ type: 'integer' }) order: number;
  @ApiProperty({ type: [CatalogLessonDto], description: 'Published only.' })
  lessons: CatalogLessonDto[];
}

@ApiSchema({ name: 'LessonProgress' })
export class LessonProgressDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  completedLessonIds: string[];
  @ApiProperty({
    type: 'integer',
    description: 'Lessons completed since 00:00 Asia/Tashkent.',
  })
  doneToday: number;
}

@ApiSchema({ name: 'LessonCatalog' })
export class LessonCatalogDto {
  @ApiProperty({ type: LessonsConfigDto }) config: LessonsConfigDto;
  @ApiProperty({
    type: [CatalogTierDto],
    description: 'Tiers with at least one published lesson, by order.',
  })
  tiers: CatalogTierDto[];
  @ApiProperty({
    type: LessonProgressDto,
    nullable: true,
    description: 'Null for guests.',
  })
  progress: LessonProgressDto | null;
}

@ApiSchema({ name: 'PublicLessonImage' })
export class PublicLessonImageDto {
  @ApiProperty({ example: 'https://cdn.example.com/lessons/<uuid>.webp' })
  url: string;
}

@ApiSchema({ name: 'PublicQuestion' })
export class PublicQuestionDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: 'integer' }) order: number;
  @ApiProperty({ type: LessonTextDto }) prompt: LessonTextDto;
  @ApiProperty({ type: LessonTextDto, nullable: true })
  hint: LessonTextDto | null;
  @ApiProperty({ type: [LessonTextDto] }) options: LessonTextDto[];
  @ApiProperty({ type: 'integer' }) correctIndex: number;
  @ApiProperty({ type: LessonTextDto }) explanation: LessonTextDto;
  @ApiProperty({ type: LessonTextDto, nullable: true })
  wrongExplanation: LessonTextDto | null;
  @ApiProperty({ type: PublicLessonImageDto, nullable: true })
  image: PublicLessonImageDto | null;
}

@ApiSchema({ name: 'PublicLesson' })
export class PublicLessonDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() tierKey: string;
  @ApiProperty({ type: LessonTextDto }) title: LessonTextDto;
  @ApiProperty({ enum: LESSON_ICONS, enumName: 'LessonIcon' })
  icon: LessonIcon;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: [PublicQuestionDto] }) questions: PublicQuestionDto[];
}

@ApiSchema({ name: 'CompletionLevelUp' })
export class CompletionLevelUpDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: 'integer' }) fromLevel: number;
  @ApiProperty({ type: 'integer' }) toLevel: number;
}

@ApiSchema({ name: 'CompletionResult' })
export class CompletionResultDto {
  @ApiProperty() firstCompletion: boolean;
  @ApiProperty() perfect: boolean;
  @ApiProperty({ type: 'integer', description: '0 for a repeat.' })
  xpAwarded: number;
  @ApiProperty({ type: 'integer' }) doneToday: number;
  @ApiProperty({ type: 'integer' }) dailyGoal: number;
  @ApiProperty({ type: [CompletionLevelUpDto] })
  levelUps: CompletionLevelUpDto[];
}

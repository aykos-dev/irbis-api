import { ApiProperty } from '@nestjs/swagger';
import {
  LESSON_ICONS,
  LESSON_STATUSES,
  type LessonIcon,
  type LessonStatusCode,
} from '../lessons-admin.constants.js';

export class L10nDto {
  @ApiProperty() uz: string;
  @ApiProperty() ru: string;
  @ApiProperty() en: string;
}

export class AdminTierDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() key: string;
  @ApiProperty({ type: L10nDto }) title: L10nDto;
  @ApiProperty({ example: '#58CC02' }) colour: string;
  @ApiProperty({ type: 'integer' }) order: number;
  @ApiProperty({ type: 'integer' }) lessonCount: number;
  @ApiProperty({ type: 'integer' }) publishedCount: number;
}

export class AdminTierListDto {
  @ApiProperty({ type: [AdminTierDto] }) items: AdminTierDto[];
}

export class AdminLessonSummaryDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: L10nDto }) title: L10nDto;
  @ApiProperty({ enum: LESSON_ICONS, enumName: 'LessonIcon' })
  icon: LessonIcon;
  @ApiProperty({ type: 'integer' }) order: number;
  @ApiProperty({ enum: LESSON_STATUSES, enumName: 'LessonStatus' })
  status: LessonStatusCode;
  @ApiProperty({ type: 'integer' }) questionCount: number;
  @ApiProperty({ type: Date, nullable: true }) publishedAt: Date | null;
  @ApiProperty() updatedAt: Date;
}

export class AdminLessonSummaryListDto {
  @ApiProperty({ type: [AdminLessonSummaryDto] })
  items: AdminLessonSummaryDto[];
}

export class LessonImageDto {
  @ApiProperty() key: string;
  @ApiProperty({ type: String, nullable: true }) url: string | null;
}

export class AdminQuestionDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: 'integer' }) order: number;
  @ApiProperty({ type: L10nDto }) prompt: L10nDto;
  @ApiProperty({ type: L10nDto, nullable: true }) hint: L10nDto | null;
  @ApiProperty({ type: [L10nDto] }) options: L10nDto[];
  @ApiProperty({ type: 'integer' }) correctIndex: number;
  @ApiProperty({ type: L10nDto }) explanation: L10nDto;
  @ApiProperty({ type: L10nDto, nullable: true })
  wrongExplanation: L10nDto | null;
  @ApiProperty({ type: LessonImageDto, nullable: true })
  image: LessonImageDto | null;
}

export class AdminLessonDto extends AdminLessonSummaryDto {
  @ApiProperty({ format: 'uuid' }) tierId: string;
  @ApiProperty({ type: [AdminQuestionDto] }) questions: AdminQuestionDto[];
}

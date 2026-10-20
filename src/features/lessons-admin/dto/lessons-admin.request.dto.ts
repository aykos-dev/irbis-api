import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  COLOUR_PATTERN,
  IMAGE_KEY_MAX,
  LESSON_ICONS,
  LESSON_TEXT_MAX,
  OPTION_TEXT_MAX,
  OPTIONS_MAX,
  OPTIONS_MIN,
  QUESTIONS_MAX,
  REORDER_IDS_MAX,
  TIER_KEY_PATTERN,
  type LessonIcon,
} from '../lessons-admin.constants.js';

export class IdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;
}

/** uz/ru/en text; drafts may hold "". */
export class L10nInputDto {
  @ApiProperty({ maxLength: LESSON_TEXT_MAX })
  @IsString()
  @MaxLength(LESSON_TEXT_MAX)
  uz: string;

  @ApiProperty({ maxLength: LESSON_TEXT_MAX })
  @IsString()
  @MaxLength(LESSON_TEXT_MAX)
  ru: string;

  @ApiProperty({ maxLength: LESSON_TEXT_MAX })
  @IsString()
  @MaxLength(LESSON_TEXT_MAX)
  en: string;
}

export class OptionInputDto {
  @ApiProperty({ maxLength: OPTION_TEXT_MAX })
  @IsString()
  @MaxLength(OPTION_TEXT_MAX)
  uz: string;

  @ApiProperty({ maxLength: OPTION_TEXT_MAX })
  @IsString()
  @MaxLength(OPTION_TEXT_MAX)
  ru: string;

  @ApiProperty({ maxLength: OPTION_TEXT_MAX })
  @IsString()
  @MaxLength(OPTION_TEXT_MAX)
  en: string;
}

export class CreateTierDto {
  @ApiProperty({
    pattern: TIER_KEY_PATTERN.source,
    description: 'Unique and immutable; level gates use it.',
  })
  @IsString()
  @Matches(TIER_KEY_PATTERN)
  key: string;

  @ApiProperty({ type: L10nInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => L10nInputDto)
  title: L10nInputDto;

  @ApiProperty({ pattern: COLOUR_PATTERN.source, example: '#58CC02' })
  @IsString()
  @Matches(COLOUR_PATTERN)
  colour: string;
}

export class UpdateTierDto {
  @ApiPropertyOptional({ type: L10nInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => L10nInputDto)
  title?: L10nInputDto;

  @ApiPropertyOptional({ pattern: COLOUR_PATTERN.source, example: '#58CC02' })
  @IsOptional()
  @IsString()
  @Matches(COLOUR_PATTERN)
  colour?: string;
}

export class ReorderDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    maxItems: REORDER_IDS_MAX,
    description: 'Every id of the list, in the new order.',
  })
  @IsArray()
  @ArrayMaxSize(REORDER_IDS_MAX)
  @IsUUID('all', { each: true })
  ids: string[];
}

export class CreateLessonDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tierId: string;

  @ApiProperty({ type: L10nInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => L10nInputDto)
  title: L10nInputDto;

  @ApiProperty({ enum: LESSON_ICONS, enumName: 'LessonIcon' })
  @IsIn(LESSON_ICONS)
  icon: LessonIcon;
}

export class ImageInputDto {
  @ApiProperty({ maxLength: IMAGE_KEY_MAX })
  @IsString()
  @IsNotEmpty()
  @MaxLength(IMAGE_KEY_MAX)
  key: string;
}

export class QuestionInputDto {
  @ApiProperty({ type: L10nInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => L10nInputDto)
  prompt: L10nInputDto;

  @ApiPropertyOptional({ type: L10nInputDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => L10nInputDto)
  hint?: L10nInputDto | null;

  @ApiProperty({
    type: [OptionInputDto],
    minItems: OPTIONS_MIN,
    maxItems: OPTIONS_MAX,
  })
  @IsArray()
  @ArrayMinSize(OPTIONS_MIN)
  @ArrayMaxSize(OPTIONS_MAX)
  @ValidateNested({ each: true })
  @Type(() => OptionInputDto)
  options: OptionInputDto[];

  @ApiProperty({
    type: 'integer',
    minimum: 0,
    description: 'Index into options.',
  })
  @IsInt()
  @Min(0)
  correctIndex: number;

  @ApiProperty({ type: L10nInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => L10nInputDto)
  explanation: L10nInputDto;

  @ApiPropertyOptional({ type: L10nInputDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => L10nInputDto)
  wrongExplanation?: L10nInputDto | null;

  @ApiPropertyOptional({ type: ImageInputDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImageInputDto)
  image?: ImageInputDto | null;
}

export class ReplaceLessonDto {
  @ApiProperty({ type: L10nInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => L10nInputDto)
  title: L10nInputDto;

  @ApiProperty({ enum: LESSON_ICONS, enumName: 'LessonIcon' })
  @IsIn(LESSON_ICONS)
  icon: LessonIcon;

  @ApiProperty({
    type: [QuestionInputDto],
    maxItems: QUESTIONS_MAX,
    description: 'Array order = question order.',
  })
  @IsArray()
  @ArrayMaxSize(QUESTIONS_MAX)
  @ValidateNested({ each: true })
  @Type(() => QuestionInputDto)
  questions: QuestionInputDto[];
}

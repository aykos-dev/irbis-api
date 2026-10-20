import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ATTEMPTS_MAX,
  ATTEMPTS_MIN,
  OPTION_INDEX_MAX,
} from '../lessons.constants.js';

@ApiSchema({ name: 'CompletionAttempt' })
export class CompletionAttemptDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  questionId: string;

  @ApiProperty({ type: 'integer', minimum: 0, maximum: OPTION_INDEX_MAX })
  @IsInt()
  @Min(0)
  @Max(OPTION_INDEX_MAX)
  optionIndex: number;
}

@ApiSchema({ name: 'CompletionInput' })
export class CompletionInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  lessonId: string;

  @ApiProperty({
    format: 'date-time',
    description:
      'When the run finished on the device; the server time is used when it is in the future or older than 7 days.',
  })
  @IsISO8601({ strict: true })
  completedAt: string;

  @ApiProperty({
    type: [CompletionAttemptDto],
    minItems: ATTEMPTS_MIN,
    maxItems: ATTEMPTS_MAX,
    description: 'Every answer given in the run, wrong ones included.',
  })
  @IsArray()
  @ArrayMinSize(ATTEMPTS_MIN)
  @ArrayMaxSize(ATTEMPTS_MAX)
  @ValidateNested({ each: true })
  @Type(() => CompletionAttemptDto)
  attempts: CompletionAttemptDto[];
}

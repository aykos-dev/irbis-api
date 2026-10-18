import { ApiProperty } from '@nestjs/swagger';

const LESSON_GATE_KINDS = ['count', 'tier', 'all'] as const;
type LessonGateKind = (typeof LESSON_GATE_KINDS)[number];

export class LessonGateDto {
  @ApiProperty({
    enum: LESSON_GATE_KINDS,
    enumName: 'LessonGateKind',
    description:
      'count: any lessons; tier: lessons of `tier`; all: every lesson.',
  })
  kind: LessonGateKind;

  @ApiProperty({ type: String, nullable: true, example: '2' })
  tier: string | null;

  @ApiProperty({ type: 'integer' }) required: number;
}

export class CheckInGateDto {
  @ApiProperty({ type: 'integer' }) required: number;

  @ApiProperty({
    type: 'integer',
    description: 'Only check-ins at places of at least this difficulty count.',
  })
  minDifficulty: number;
}

export class LevelDefDto {
  @ApiProperty({ type: 'integer', example: 2 }) level: number;
  @ApiProperty({ type: 'integer', description: 'Total XP needed.' })
  xp: number;
  @ApiProperty({ type: LessonGateDto }) lessons: LessonGateDto;
  @ApiProperty({ type: CheckInGateDto }) checkIns: CheckInGateDto;
  @ApiProperty({ type: 'integer' }) verifiedSpots: number;

  @ApiProperty({
    type: 'integer',
    description: 'Hardest place difficulty this level opens.',
  })
  maxDifficulty: number;

  @ApiProperty({
    type: 'integer',
    description: 'Places whose requiredLevel is this level.',
  })
  newPlacesCount: number;
}

export class LevelListResponseDto {
  @ApiProperty({ type: [LevelDefDto], description: 'Levels 1..7 in order.' })
  items: LevelDefDto[];
}

export class ProgressBarDto {
  @ApiProperty({ type: 'integer' }) current: number;
  @ApiProperty({ type: 'integer' }) required: number;
}

export class LessonProgressDto extends ProgressBarDto {
  @ApiProperty({ enum: LESSON_GATE_KINDS, enumName: 'LessonGateKind' })
  kind: LessonGateKind;

  @ApiProperty({ type: String, nullable: true }) tier: string | null;
}

export class CheckInProgressDto extends ProgressBarDto {
  @ApiProperty({ type: 'integer' }) minDifficulty: number;
}

export class NextLevelDto {
  @ApiProperty({ type: 'integer' }) level: number;
  @ApiProperty({ type: ProgressBarDto }) xp: ProgressBarDto;
  @ApiProperty({ type: LessonProgressDto }) lessons: LessonProgressDto;
  @ApiProperty({ type: CheckInProgressDto }) checkIns: CheckInProgressDto;

  @ApiProperty({
    type: ProgressBarDto,
    nullable: true,
    description: 'Null when the next level needs no verified spots.',
  })
  verifiedSpots: ProgressBarDto | null;
}

export class PendingLevelUpDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: 'integer' }) fromLevel: number;
  @ApiProperty({ type: 'integer' }) toLevel: number;
  @ApiProperty({ type: 'integer' }) maxDifficulty: number;
  @ApiProperty({ type: 'integer' }) newPlacesCount: number;
}

export class MyLevelDto {
  @ApiProperty({ type: 'integer', example: 1 }) level: number;
  @ApiProperty({ type: 'integer' }) xpTotal: number;
  @ApiProperty({ format: 'date-time' }) reachedAt: string;

  @ApiProperty({
    type: NextLevelDto,
    nullable: true,
    description: 'Null at the top level.',
  })
  next: NextLevelDto | null;

  @ApiProperty({
    type: [PendingLevelUpDto],
    description: 'Level-ups not yet seen, oldest first.',
  })
  pendingLevelUps: PendingLevelUpDto[];
}

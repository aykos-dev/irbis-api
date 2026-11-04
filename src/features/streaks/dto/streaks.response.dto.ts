import { ApiProperty } from '@nestjs/swagger';

const STREAK_KINDS = ['flame', 'boot'] as const;
type StreakKind = (typeof STREAK_KINDS)[number];

export class FlameStreakDto {
  @ApiProperty({
    type: 'integer',
    description: 'Consecutive counted days ending today or yesterday.',
  })
  count: number;

  @ApiProperty({ description: 'Today has a lesson or a check-in.' })
  doneToday: boolean;

  @ApiProperty({ description: 'Not done today and the count is above 0.' })
  atRisk: boolean;
}

export class BootStreakDto {
  @ApiProperty({
    type: 'integer',
    description:
      'Consecutive Monday–Sunday weeks with a check-in ending this or last week.',
  })
  count: number;

  @ApiProperty({ description: 'This week has a check-in.' })
  doneThisWeek: boolean;

  @ApiProperty({
    description:
      'Last week had no check-in and the weather shield kept the run.',
  })
  shieldedLastWeek: boolean;
}

export class StreakFreezeUseDto {
  @ApiProperty({ enum: STREAK_KINDS, enumName: 'StreakKind' })
  kind: StreakKind;

  @ApiProperty({
    example: '2026-10-14',
    description:
      "The missed day (flame) or the missed week's Monday (boot), Asia/Tashkent.",
  })
  date: string;
}

export class StreakFreezesDto {
  @ApiProperty({ type: 'integer' }) left: number;
  @ApiProperty({ type: 'integer' }) perMonth: number;
  @ApiProperty({ type: [StreakFreezeUseDto] })
  usedThisMonth: StreakFreezeUseDto[];
}

export class StreaksDto {
  @ApiProperty({ example: '2026-10-30', description: 'Asia/Tashkent date.' })
  today: string;

  @ApiProperty({ type: FlameStreakDto }) flame: FlameStreakDto;
  @ApiProperty({ type: BootStreakDto }) boot: BootStreakDto;
  @ApiProperty({ type: StreakFreezesDto }) freezes: StreakFreezesDto;
}

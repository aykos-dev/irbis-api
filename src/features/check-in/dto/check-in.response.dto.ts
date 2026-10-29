import { ApiProperty, ApiSchema } from '@nestjs/swagger';

@ApiSchema({ name: 'CheckInLevelUp' })
export class CheckInLevelUpDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: 'integer' }) fromLevel: number;
  @ApiProperty({ type: 'integer' }) toLevel: number;
}

@ApiSchema({ name: 'CheckInResult' })
export class CheckInResultDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) placeId: string;
  @ApiProperty() recordedAt: Date;

  @ApiProperty({
    description:
      'False for a repeat at the same place in the same Asia/Tashkent month (no XP).',
  })
  counted: boolean;

  @ApiProperty({ type: 'integer', description: '0 when not counted.' })
  xp: number;

  @ApiProperty({
    type: [CheckInLevelUpDto],
    description: 'Level-ups this check-in caused; empty on a replay.',
  })
  levelUps: CheckInLevelUpDto[];

  @ApiProperty({
    description:
      "True when this check-in marked a node of the month's path done.",
  })
  pathVisited: boolean;
}

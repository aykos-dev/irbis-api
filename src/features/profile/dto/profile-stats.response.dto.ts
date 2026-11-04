import { ApiProperty } from '@nestjs/swagger';

/** All-time profile stats in canonical metric units; the app converts for imperial. */
export class ProfileStatsDto {
  @ApiProperty({ type: 'integer', minimum: 0, description: 'Distinct peaks visited.' })
  peaks: number;

  @ApiProperty({ type: 'integer', minimum: 0, description: 'Distinct lakes visited.' })
  lakes: number;

  @ApiProperty({ type: 'integer', minimum: 0, description: 'Distinct caves visited.' })
  caves: number;

  @ApiProperty({
    type: 'integer',
    minimum: 0,
    description: 'Metres walked on checked-out trips.',
  })
  walkedM: number;

  @ApiProperty({
    type: 'integer',
    minimum: 0,
    description: 'Metres climbed on checked-out trips.',
  })
  climbedM: number;

  @ApiProperty({ type: 'integer', minimum: 0, description: 'Verified spots added.' })
  spots: number;
}

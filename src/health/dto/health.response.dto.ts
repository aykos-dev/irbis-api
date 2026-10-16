import { ApiProperty } from '@nestjs/swagger';

export enum HealthStatus {
  Ok = 'ok',
  Degraded = 'degraded',
}

export enum DependencyStatus {
  Up = 'up',
  Down = 'down',
}

/** Body of GET /health — identical shape for 200 (ok) and 503 (degraded). */
export class HealthResponseDto {
  @ApiProperty({
    enum: HealthStatus,
    enumName: 'HealthStatus',
    example: HealthStatus.Ok,
  })
  status: HealthStatus;

  @ApiProperty({
    enum: DependencyStatus,
    enumName: 'DependencyStatus',
    example: DependencyStatus.Up,
  })
  db: DependencyStatus;

  @ApiProperty({ example: '0.0.1', description: 'API version (package.json).' })
  version: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-10-17T08:00:00.000Z',
    description: 'Server time, ISO-8601 UTC.',
  })
  time: string;
}

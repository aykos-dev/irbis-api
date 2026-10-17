import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** The one error body every non-2xx response uses. */
export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    example: 'VALIDATION_FAILED',
    description: 'Stable code clients branch on.',
  })
  code: string;

  @ApiProperty({
    example: 'Request validation failed',
    description: 'Human-readable; not for branching.',
  })
  message: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'array', items: { type: 'string' } },
    example: { username: ['isNotEmpty'] },
  })
  fieldErrors?: Record<string, string[]>;

  @ApiPropertyOptional({
    example: 'spam',
    description: 'ACCOUNT_BLOCKED only: the block reason category.',
  })
  reasonCode?: string;

  @ApiPropertyOptional({
    example: 900,
    description:
      'ACCOUNT_LOCKED, RATE_LIMITED: seconds until the client may retry.',
  })
  retryAfterSec?: number;

  @ApiProperty({ example: '6f1c2a9e-4b7d-4c1e-9a55-0d2b8f3e7c10' })
  requestId: string;
}

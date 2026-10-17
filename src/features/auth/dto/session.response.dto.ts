import { ApiProperty } from '@nestjs/swagger';
import { MeResponseDto } from './me.response.dto.js';

export class TokensResponseDto {
  @ApiProperty({ description: 'JWT, sent as `Authorization: Bearer`.' })
  accessToken: string;

  @ApiProperty({ description: 'Opaque; rotate on every refresh.' })
  refreshToken: string;

  @ApiProperty({
    example: 900,
    description: 'Access token lifetime in seconds.',
  })
  expiresIn: number;
}

export class AuthSessionResponseDto extends TokensResponseDto {
  @ApiProperty({ type: MeResponseDto })
  me: MeResponseDto;
}

export class AdminAccessResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;
}

export class AdminSessionResponseDto extends AdminAccessResponseDto {
  @ApiProperty({ type: MeResponseDto })
  me: MeResponseDto;
}

export class CodeSentResponseDto {
  @ApiProperty({
    example: 60,
    description: 'Seconds before "send again" unlocks.',
  })
  resendAfterSec: number;
}

export class UsernameAvailabilityResponseDto {
  @ApiProperty()
  available: boolean;

  @ApiProperty({
    required: false,
    enum: ['invalid', 'reserved', 'taken'],
    description: 'Why the username cannot be used; absent when available.',
  })
  reason?: 'invalid' | 'reserved' | 'taken';
}

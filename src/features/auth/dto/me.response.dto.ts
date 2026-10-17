import { ApiProperty } from '@nestjs/swagger';
import {
  EXPERIENCES,
  INTERESTS,
  LOCALES,
  USER_ROLES,
} from '../auth.constants.js';

export class MeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'guest_1' })
  username: string;

  @ApiProperty({ enum: LOCALES, enumName: 'Locale' })
  locale: (typeof LOCALES)[number];

  @ApiProperty({ enum: EXPERIENCES, enumName: 'Experience', nullable: true })
  experience: (typeof EXPERIENCES)[number] | null;

  @ApiProperty({ enum: INTERESTS, enumName: 'Interest', isArray: true })
  interests: (typeof INTERESTS)[number][];

  @ApiProperty({ enum: USER_ROLES, enumName: 'Role' })
  role: (typeof USER_ROLES)[number];

  @ApiProperty({ description: 'A verified recovery phone exists.' })
  hasRecoveryPhone: boolean;

  @ApiProperty({
    description:
      'A recovery phone was added and its code is waiting to be verified.',
  })
  recoveryPhonePending: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;
}

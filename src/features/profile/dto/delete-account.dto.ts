import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * AC8 confirmation. Optional at the DTO so the service answers the stable
 * `fieldErrors.currentPassword=['required']`; a present value must be a string.
 */
export class DeleteAccountDto {
  @ApiProperty({
    format: 'password',
    writeOnly: true,
    description:
      'The signed-in account password; wrong answers INVALID_PASSWORD.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  currentPassword?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { LOCALES, type LocaleCode } from '../auth.constants.js';

export class SignUpDto {
  @ApiProperty({
    example: 'guest_1',
    description:
      '3-20 chars a-z 0-9 . _ ; case-insensitive; no leading/trailing dot.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username: string;

  @ApiProperty({
    description: '6-64 chars, not the username, not a common password.',
  })
  @IsString()
  @MaxLength(256)
  password: string;

  @ApiPropertyOptional({ example: '+998XXXXXXXXX' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  recoveryPhone?: string;

  @ApiProperty({ enum: LOCALES, enumName: 'Locale' })
  @IsIn(LOCALES)
  locale: LocaleCode;

  @ApiProperty()
  @IsBoolean()
  acceptTerms: boolean;
}

export class CreateDemoDto {
  @ApiProperty({ enum: LOCALES, enumName: 'Locale' })
  @IsIn(LOCALES)
  locale: LocaleCode;
}

/** POST /v1/me/secure: same username and password rules as sign-up. */
export class SecureAccountDto {
  @ApiProperty({
    example: 'guest_1',
    description:
      '3-20 chars a-z 0-9 . _ ; case-insensitive; no leading/trailing dot.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username: string;

  @ApiProperty({
    description: '6-64 chars, not the username, not a common password.',
  })
  @IsString()
  @MaxLength(256)
  password: string;

  @ApiProperty({ description: 'Must be true, as on sign-up.' })
  @IsBoolean()
  acceptTerms: boolean;
}

export class LogInDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  password: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  refreshToken: string;
}

export class UsernameAvailableQueryDto {
  @ApiProperty({ description: 'The username to check (any case).' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  u: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/)
  code: string;

  @ApiProperty({
    description: '6-64 chars, not the username, not a common password.',
  })
  @IsString()
  @MaxLength(256)
  newPassword: string;
}

export class RecoveryPhoneDto {
  @ApiProperty({
    example: '+998XXXXXXXXX',
    description: '+998 followed by 9 digits.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone: string;
}

export class VerifyRecoveryPhoneDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/)
  code: string;
}

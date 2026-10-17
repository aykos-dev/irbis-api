import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ADMIN_ACTIONS,
  BLOCK_REASON_CODES,
  LOCALES,
  USER_ROLES,
  type BlockReason,
  type UserRole,
} from '../auth.constants.js';

const STATUSES = ['active', 'blocked', 'locked'] as const;
const JOINED = ['today', '7d', '30d'] as const;
const SORTS = [
  'joined_desc',
  'joined_asc',
  'active_desc',
  'active_asc',
] as const;

export class UserIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;
}

// --- requests ---

export class AdminUsersQueryDto {
  @ApiPropertyOptional({ description: 'Username contains (case-insensitive).' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  q?: string;

  @ApiPropertyOptional({ enum: STATUSES, enumName: 'AdminUserStatus' })
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @ApiPropertyOptional({ enum: USER_ROLES, enumName: 'Role' })
  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @ApiPropertyOptional({
    enum: JOINED,
    enumName: 'AdminJoinedFilter',
    description: 'Joined today (Asia/Tashkent) or in the last 7 / 30 days.',
  })
  @IsOptional()
  @IsIn(JOINED)
  joined?: (typeof JOINED)[number];

  @ApiPropertyOptional({
    enum: SORTS,
    enumName: 'AdminUserSort',
    default: 'joined_desc',
  })
  @IsOptional()
  @IsIn(SORTS)
  sort?: (typeof SORTS)[number];

  @ApiPropertyOptional({
    description: "Opaque; the previous page's nextCursor.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class AdminAuditQueryDto {
  @ApiPropertyOptional({
    description: "Opaque; the previous page's nextCursor.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class BlockUserDto {
  @ApiProperty({ enum: BLOCK_REASON_CODES, enumName: 'BlockReasonCode' })
  @IsIn(BLOCK_REASON_CODES)
  reasonCode: BlockReason;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note: string;
}

export class UnblockUserDto {
  @ApiPropertyOptional({
    enum: BLOCK_REASON_CODES,
    enumName: 'BlockReasonCode',
  })
  @IsOptional()
  @IsIn(BLOCK_REASON_CODES)
  reasonCode?: BlockReason;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note: string;
}

export class SetUserPasswordDto {
  @ApiProperty({
    description: '6-64 chars, not the username, not a common password.',
  })
  @IsString()
  @MaxLength(256)
  newPassword: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note: string;
}

export class SetUserRecoveryPhoneDto {
  @ApiProperty({ example: '+998XXXXXXXXX' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note: string;
}

export class SetUserRoleDto {
  @ApiProperty({ enum: USER_ROLES, enumName: 'Role' })
  @IsIn(USER_ROLES)
  role: UserRole;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note: string;
}

// --- responses ---

export class DailySignupsDto {
  @ApiProperty({
    example: '2026-10-17',
    description: 'Asia/Tashkent calendar day.',
  })
  date: string;

  @ApiProperty()
  count: number;
}

export class UserStatsResponseDto {
  @ApiProperty() total: number;
  @ApiProperty({ description: 'Joined since 00:00 Asia/Tashkent today.' })
  newToday: number;
  @ApiProperty({ description: 'Joined in the last 7 days.' }) new7d: number;
  @ApiProperty({ description: 'Active in the last 7 days.' }) active7d: number;
  @ApiProperty() blocked: number;
  @ApiProperty({
    example: 42.5,
    description:
      'Percent of users with a verified recovery phone, one decimal.',
  })
  withPhonePct: number;

  @ApiProperty({
    type: [DailySignupsDto],
    description: '30 entries, oldest first, zero-filled.',
  })
  signupsByDay: DailySignupsDto[];
}

export class AdminUserListItemDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() username: string;
  @ApiProperty({ enum: USER_ROLES, enumName: 'Role' }) role: UserRole;
  @ApiProperty({ enum: STATUSES, enumName: 'AdminUserStatus' })
  status: (typeof STATUSES)[number];
  @ApiProperty({ format: 'date-time' }) joinedAt: string;
  @ApiProperty({ format: 'date-time' }) lastActiveAt: string;

  @ApiProperty({ type: String, nullable: true, example: '+998 •• ••• •• 67' })
  recoveryPhoneMasked: string | null;
}

export class AdminUserListResponseDto {
  @ApiProperty({ type: [AdminUserListItemDto] })
  items: AdminUserListItemDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor: string | null;

  @ApiProperty({
    description: 'Users matching the filters, ignoring the cursor.',
  })
  total: number;
}

export class AdminUserDetailDto extends AdminUserListItemDto {
  @ApiProperty({ enum: LOCALES, enumName: 'Locale' })
  locale: (typeof LOCALES)[number];
  @ApiProperty() recoveryPhoneVerified: boolean;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  blockedAt: string | null;

  @ApiProperty({
    enum: BLOCK_REASON_CODES,
    enumName: 'BlockReasonCode',
    nullable: true,
  })
  blockReasonCode: BlockReason | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Seconds the log-in lockout still lasts; null when not locked.',
  })
  lockedForSec: number | null;

  @ApiProperty({
    description: 'Signed-in sessions (refresh tokens still valid).',
  })
  sessionsCount: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Always null until the levels feature exists.',
  })
  level: number | null;
}

export class AuditAdminDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() username: string;
}

export class AdminAuditItemDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: AuditAdminDto }) admin: AuditAdminDto;
  @ApiProperty({ enum: ADMIN_ACTIONS, enumName: 'AdminAction' })
  action: (typeof ADMIN_ACTIONS)[number];
  @ApiProperty({
    enum: BLOCK_REASON_CODES,
    enumName: 'BlockReasonCode',
    nullable: true,
  })
  reasonCode: BlockReason | null;
  @ApiProperty() note: string;
  @ApiProperty({ type: String, nullable: true, example: 'role: user -> admin' })
  detail: string | null;
  @ApiProperty({ format: 'date-time' }) at: string;
}

export class AdminAuditListResponseDto {
  @ApiProperty({ type: [AdminAuditItemDto], description: 'Newest first.' })
  items: AdminAuditItemDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor: string | null;
}

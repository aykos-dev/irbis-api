import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const NOTIFICATION_CATEGORIES = [
  'trips',
  'social',
  'rewards',
] as const;
export type NotificationCategoryCode = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATIONS_DEFAULT_LIMIT = 20;
export const NOTIFICATIONS_MAX_LIMIT = 50;

/** Filters for the notifications inbox; the cursor is opaque. */
export class NotificationsQueryDto {
  @ApiPropertyOptional({
    enum: NOTIFICATION_CATEGORIES,
    enumName: 'NotificationCategory',
  })
  @IsOptional()
  @IsIn(NOTIFICATION_CATEGORIES)
  category?: NotificationCategoryCode;

  @ApiPropertyOptional({ description: "Opaque; the previous page's nextCursor." })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  cursor?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: NOTIFICATIONS_MAX_LIMIT,
    default: NOTIFICATIONS_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(NOTIFICATIONS_MAX_LIMIT)
  limit?: number;
}

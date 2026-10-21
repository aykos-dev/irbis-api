import { ApiProperty } from '@nestjs/swagger';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategoryCode,
} from './notifications.request.dto.js';

/** One inbox row, with `title`/`body` already resolved to the account locale. */
export class NotificationItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    enum: NOTIFICATION_CATEGORIES,
    enumName: 'NotificationCategory',
  })
  category: NotificationCategoryCode;

  @ApiProperty({ example: 'trip_reminder' })
  kind: string;

  @ApiProperty({
    description: 'Localized to the account locale, falling back to en.',
  })
  title: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Localized like title; null when the row has no body.',
  })
  body: string | null;

  @ApiProperty({
    type: Object,
    nullable: true,
    description: 'The stored JSON payload, or null.',
  })
  data: unknown;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  readAt: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;
}

export class NotificationsListResponseDto {
  @ApiProperty({ type: [NotificationItemDto] })
  items: NotificationItemDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor: string | null;

  @ApiProperty({
    type: 'integer',
    description: 'Unread rows for the user across all categories.',
  })
  unreadCount: number;
}

export class NotificationsReadAllResponseDto {
  @ApiProperty({ type: 'integer', description: 'Rows that became read.' })
  updated: number;
}

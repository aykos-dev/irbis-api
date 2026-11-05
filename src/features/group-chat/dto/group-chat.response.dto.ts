import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GroupMessageAuthorDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() username: string;
  @ApiProperty({ type: String, nullable: true }) displayName: string | null;
  @ApiProperty({ type: String, nullable: true }) avatarUrl: string | null;
  @ApiProperty({ type: 'integer' }) level: number;
  @ApiProperty() verifiedLeader: boolean;
}

export class GroupMessageAttachmentResponseDto {
  @ApiProperty({ enum: ['photo', 'place'] }) type: 'photo' | 'place';
  @ApiPropertyOptional({ type: String, nullable: true }) imageUrl:
    string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) placeId: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) placeName:
    string | null;
}

export class GroupReactionResponseDto {
  @ApiProperty() emoji: string;
  @ApiProperty({ type: 'integer' }) count: number;
  @ApiProperty() mine: boolean;
}

export class GroupReplyPreviewDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: String, nullable: true }) body: string | null;
  @ApiProperty({ type: String, nullable: true }) username: string | null;
}

export class GroupTripCardDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Set for live group-trip cards; null for seeded cards.',
  })
  groupTripId: string | null;
  @ApiProperty({ description: 'Place name in the viewer locale.' })
  title: string;
  @ApiProperty() startsAt: string;
  @ApiProperty() meetingTime: string;
  @ApiProperty({ type: 'integer' }) difficulty: number;
  @ApiProperty({ type: 'integer' }) requiredLevel: number;
  @ApiProperty({ type: 'integer' }) capacity: number;
  @ApiProperty({ type: 'integer' }) joined: number;
  @ApiProperty() condition: string;
  @ApiProperty({ type: String, nullable: true }) imageUrl: string | null;
}

export class GroupMessageDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) groupId: string;
  @ApiProperty({ enum: ['text', 'trip'] }) kind: 'text' | 'trip';
  @ApiProperty({ type: GroupMessageAuthorDto, nullable: true })
  author: GroupMessageAuthorDto | null;
  @ApiProperty({ type: String, nullable: true }) body: string | null;
  @ApiProperty({ type: GroupReplyPreviewDto, nullable: true })
  replyTo: GroupReplyPreviewDto | null;
  @ApiProperty({ type: [GroupMessageAttachmentResponseDto] })
  attachments: GroupMessageAttachmentResponseDto[];
  @ApiProperty({ type: [GroupReactionResponseDto] })
  reactions: GroupReactionResponseDto[];
  @ApiProperty({ type: [String] }) mentionedUserIds: string[];
  @ApiProperty({ type: 'integer' }) readByCount: number;
  @ApiProperty({ type: GroupTripCardDto, nullable: true })
  trip: GroupTripCardDto | null;
  @ApiProperty({ type: String, nullable: true }) editedAt: string | null;
  @ApiProperty({ type: String, nullable: true }) deletedAt: string | null;
  @ApiProperty() createdAt: string;
}

export class GroupMessagesPageDto {
  @ApiProperty({ type: [GroupMessageDto] }) items: GroupMessageDto[];
  @ApiProperty({ type: String, nullable: true }) nextCursor: string | null;
}

export class GroupPhotoUploadDto {
  @ApiProperty() imageKey: string;
  @ApiProperty() imageUrl: string;
}

export class GroupChatActionDto {
  @ApiProperty() status: string;
}

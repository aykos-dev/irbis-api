import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  GROUP_MESSAGE_ATTACHMENTS_MAX,
  GROUP_MESSAGE_MAX,
  GROUP_MESSAGE_PAGE_DEFAULT,
  GROUP_MESSAGE_PAGE_MAX,
  GROUP_REACTION_MAX,
} from '../group-chat.constants.js';

export class GroupMessagesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
  @ApiPropertyOptional({
    default: GROUP_MESSAGE_PAGE_DEFAULT,
    maximum: GROUP_MESSAGE_PAGE_MAX,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(GROUP_MESSAGE_PAGE_MAX)
  limit?: number;
}

export class GroupMessageAttachmentDto {
  @ApiProperty({ enum: ['photo', 'place'] })
  @IsIn(['photo', 'place'])
  type: 'photo' | 'place';
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageKey?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  placeId?: string;
}

export class CreateGroupMessageDto {
  @ApiPropertyOptional({ maxLength: GROUP_MESSAGE_MAX })
  @IsOptional()
  @IsString()
  @MaxLength(GROUP_MESSAGE_MAX)
  body?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  replyToId?: string;
  @ApiPropertyOptional({
    type: [GroupMessageAttachmentDto],
    maxItems: GROUP_MESSAGE_ATTACHMENTS_MAX,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(GROUP_MESSAGE_ATTACHMENTS_MAX)
  @ValidateNested({ each: true })
  @Type(() => GroupMessageAttachmentDto)
  attachments?: GroupMessageAttachmentDto[];
}

export class EditGroupMessageDto {
  @ApiProperty({ maxLength: GROUP_MESSAGE_MAX })
  @IsString()
  @MaxLength(GROUP_MESSAGE_MAX)
  body: string;
}

export class GroupReactionDto {
  @ApiProperty({ maxLength: GROUP_REACTION_MAX, example: '👍' })
  @IsString()
  @MaxLength(GROUP_REACTION_MAX)
  emoji: string;
}

export class GroupReadDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() messageId: string;
}

export class GroupMuteDto {
  @ApiProperty() @IsBoolean() muted: boolean;
}

export class GroupPhotoUploadRequestDto {
  @ApiProperty({ type: 'string', format: 'binary' }) image: string;
}

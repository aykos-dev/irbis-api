import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  CreateGroupMessageDto,
  EditGroupMessageDto,
  GroupMessagesQueryDto,
  GroupMuteDto,
  GroupPhotoUploadRequestDto,
  GroupReactionDto,
  GroupReadDto,
} from './dto/group-chat.request.dto.js';
import {
  GroupChatActionDto,
  GroupMessageDto,
  GroupMessagesPageDto,
  GroupPhotoUploadDto,
} from './dto/group-chat.response.dto.js';
import { GROUP_MESSAGE_PHOTO_MAX_BYTES } from './group-chat.constants.js';
import { GroupAttachmentInvalidError } from './group-chat.errors.js';
import { GroupChatImagesService } from './group-chat-images.service.js';
import { GroupChatService } from './group-chat.service.js';

@ApiTags('Group chat')
@ApiBearerAuth()
@Controller('groups/:groupId')
export class GroupChatController {
  constructor(
    private readonly chat: GroupChatService,
    private readonly images: GroupChatImagesService,
  ) {}

  @Get('messages')
  @ApiOperation({
    operationId: 'GroupChat_list',
    summary: 'Cursor-paginated member chat history',
  })
  @ApiOkResponse({ type: GroupMessagesPageDto })
  list(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Query() query: GroupMessagesQueryDto,
  ): Promise<GroupMessagesPageDto> {
    return this.chat.list(user.id, groupId, query);
  }

  @Post('messages')
  @ApiOperation({
    operationId: 'GroupChat_send',
    summary: 'Send text, reply, photo or place attachments',
  })
  @ApiOkResponse({ type: GroupMessageDto })
  @ApiErrorResponses({
    400: ['GROUP_MESSAGE_EMPTY', 'GROUP_ATTACHMENT_INVALID'],
    403: ['GROUP_MEMBERSHIP_REQUIRED'],
  })
  send(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Body() dto: CreateGroupMessageDto,
  ): Promise<GroupMessageDto> {
    return this.chat.send(user.id, groupId, dto);
  }

  @Patch('messages/:messageId')
  @ApiOperation({
    operationId: 'GroupChat_edit',
    summary: 'Edit your text message',
  })
  @ApiOkResponse({ type: GroupMessageDto })
  edit(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Param('messageId') messageId: string,
    @Body() dto: EditGroupMessageDto,
  ): Promise<GroupMessageDto> {
    return this.chat.edit(user.id, groupId, messageId, dto.body);
  }

  @Delete('messages/:messageId')
  @ApiOperation({
    operationId: 'GroupChat_delete',
    summary: 'Delete your message, or moderate as group admin',
  })
  @ApiOkResponse({ type: GroupMessageDto })
  delete(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Param('messageId') messageId: string,
  ): Promise<GroupMessageDto> {
    return this.chat.delete(user.id, groupId, messageId);
  }

  @Put('messages/:messageId/reactions')
  @ApiOperation({
    operationId: 'GroupChat_addReaction',
    summary: 'Add one emoji reaction',
  })
  @ApiOkResponse({ type: GroupChatActionDto })
  react(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Param('messageId') messageId: string,
    @Body() dto: GroupReactionDto,
  ): Promise<GroupChatActionDto> {
    return this.chat.react(user.id, groupId, messageId, dto.emoji, true);
  }

  @Delete('messages/:messageId/reactions')
  @ApiOperation({
    operationId: 'GroupChat_removeReaction',
    summary: 'Remove one emoji reaction',
  })
  @ApiOkResponse({ type: GroupChatActionDto })
  unreact(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Param('messageId') messageId: string,
    @Body() dto: GroupReactionDto,
  ): Promise<GroupChatActionDto> {
    return this.chat.react(user.id, groupId, messageId, dto.emoji, false);
  }

  @Post('messages/read')
  @ApiOperation({
    operationId: 'GroupChat_markRead',
    summary: 'Advance your group read receipt',
  })
  @ApiOkResponse({ type: GroupChatActionDto })
  read(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Body() dto: GroupReadDto,
  ): Promise<GroupChatActionDto> {
    return this.chat.read(user.id, groupId, dto.messageId);
  }

  @Patch('chat/mute')
  @ApiOperation({
    operationId: 'GroupChat_mute',
    summary: 'Mute or unmute mention notifications for this group',
  })
  @ApiOkResponse({ type: GroupChatActionDto })
  mute(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Body() dto: GroupMuteDto,
  ): Promise<GroupChatActionDto> {
    return this.chat.mute(user.id, groupId, dto.muted);
  }

  @Post('messages/photos')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: GroupPhotoUploadRequestDto })
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: GROUP_MESSAGE_PHOTO_MAX_BYTES },
    }),
  )
  @ApiOperation({
    operationId: 'GroupChat_uploadPhoto',
    summary: 'Upload one gallery photo for a message',
  })
  @ApiOkResponse({ type: GroupPhotoUploadDto })
  async upload(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<GroupPhotoUploadDto> {
    await this.chat.ensureMember(user.id, groupId);
    if (!file) throw new GroupAttachmentInvalidError();
    return this.images.upload(user.id, file.buffer);
  }
}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StorageModule } from '../../lib/storage/storage.module.js';
import { GroupsModule } from '../groups/groups.module.js';
import { GroupChatController } from './group-chat.controller.js';
import { GroupChatEvents } from './group-chat.events.js';
import { GroupChatGateway } from './group-chat.gateway.js';
import { GroupChatImagesService } from './group-chat-images.service.js';
import { GroupChatRepository } from './group-chat.repository.js';
import { GroupChatService } from './group-chat.service.js';

@Module({
  imports: [GroupsModule, StorageModule, JwtModule.register({})],
  controllers: [GroupChatController],
  providers: [
    GroupChatEvents,
    GroupChatGateway,
    GroupChatImagesService,
    GroupChatRepository,
    GroupChatService,
  ],
  exports: [GroupChatEvents, GroupChatService],
})
export class GroupChatModule {}

import { Module } from '@nestjs/common';
import { StorageModule } from '../../lib/storage/storage.module.js';
import { GroupsController } from './groups.controller.js';
import { GroupsRepository } from './groups.repository.js';
import { GroupsService } from './groups.service.js';

@Module({
  imports: [StorageModule],
  controllers: [GroupsController],
  providers: [GroupsRepository, GroupsService],
  exports: [GroupsRepository, GroupsService],
})
export class GroupsModule {}

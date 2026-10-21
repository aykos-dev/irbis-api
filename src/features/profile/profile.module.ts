import { Module } from '@nestjs/common';
import { StorageModule } from '../../lib/storage/storage.module.js';
import { AuthModule } from '../auth/auth.module.js';
import {
  MeProfileController,
  ProfileController,
} from './profile.controller.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsRepository } from './notifications.repository.js';
import { NotificationsService } from './notifications.service.js';
import { ProfileAvatarService } from './profile-avatar.service.js';
import { ProfileRepository } from './profile.repository.js';
import { ProfileService } from './profile.service.js';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [
    ProfileController,
    MeProfileController,
    NotificationsController,
  ],
  providers: [
    ProfileService,
    ProfileAvatarService,
    ProfileRepository,
    NotificationsService,
    NotificationsRepository,
  ],
})
export class ProfileModule {}

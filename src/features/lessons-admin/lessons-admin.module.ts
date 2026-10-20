import { Module } from '@nestjs/common';
import { StorageModule } from '../../lib/storage/storage.module.js';
import { LevelsModule } from '../levels/levels.module.js';
import { AdminLessonImagesController } from './admin-lesson-images.controller.js';
import { AdminLessonsController } from './admin-lessons.controller.js';
import { LessonImagesService } from './lesson-images.service.js';
import { LessonsAdminRepository } from './lessons-admin.repository.js';
import { LessonsAdminService } from './lessons-admin.service.js';

@Module({
  imports: [StorageModule, LevelsModule],
  controllers: [AdminLessonsController, AdminLessonImagesController],
  providers: [LessonsAdminService, LessonsAdminRepository, LessonImagesService],
})
export class LessonsAdminModule {}

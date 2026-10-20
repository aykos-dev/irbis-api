import { Module } from '@nestjs/common';
import { AdminLessonsController } from './admin-lessons.controller.js';
import { LessonsAdminRepository } from './lessons-admin.repository.js';
import { LessonsAdminService } from './lessons-admin.service.js';

@Module({
  controllers: [AdminLessonsController],
  providers: [LessonsAdminService, LessonsAdminRepository],
})
export class LessonsAdminModule {}

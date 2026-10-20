import { Module } from '@nestjs/common';
import { StorageModule } from '../../lib/storage/storage.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { LevelsModule } from '../levels/levels.module.js';
import {
  LessonsController,
  MeLessonCompletionsController,
} from './lessons.controller.js';
import { LessonsMergeHandler } from './lessons-merge.handler.js';
import { LessonsRepository } from './lessons.repository.js';
import { LessonsService } from './lessons.service.js';

@Module({
  imports: [AuthModule, LevelsModule, StorageModule],
  controllers: [LessonsController, MeLessonCompletionsController],
  providers: [LessonsService, LessonsRepository, LessonsMergeHandler],
})
export class LessonsModule {}

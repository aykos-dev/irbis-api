import { Module } from '@nestjs/common';
import { LevelsModule } from '../levels/levels.module.js';
import { MeStreaksController } from './streaks.controller.js';
import { StreaksRepository } from './streaks.repository.js';
import { StreaksService } from './streaks.service.js';
import { WeekendConditionsJob } from './weekend-conditions.job.js';

@Module({
  imports: [LevelsModule],
  controllers: [MeStreaksController],
  providers: [StreaksService, StreaksRepository, WeekendConditionsJob],
  exports: [StreaksService],
})
export class StreaksModule {}

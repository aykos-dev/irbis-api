import { Module } from '@nestjs/common';
import { ConditionsModule } from '../conditions/conditions.module.js';
import { LevelsModule } from '../levels/levels.module.js';
import { PathWeatherJob } from './path-weather.job.js';
import { WeeklyPathController } from './weekly-path.controller.js';
import { WeeklyPathRepository } from './weekly-path.repository.js';
import { WeeklyPathService } from './weekly-path.service.js';

@Module({
  imports: [ConditionsModule, LevelsModule],
  controllers: [WeeklyPathController],
  providers: [WeeklyPathService, WeeklyPathRepository, PathWeatherJob],
  exports: [WeeklyPathService],
})
export class WeeklyPathModule {}

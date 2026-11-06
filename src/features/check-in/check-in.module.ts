import { Module } from '@nestjs/common';
import { LevelsModule } from '../levels/levels.module.js';
import { StreaksModule } from '../streaks/streaks.module.js';
import { TripEventsModule } from '../trip-events/trip-events.module.js';
import { WeeklyPathModule } from '../weekly-path/weekly-path.module.js';
import { CheckInController } from './check-in.controller.js';
import { CheckInRepository } from './check-in.repository.js';
import { CheckInService } from './check-in.service.js';

@Module({
  imports: [LevelsModule, StreaksModule, WeeklyPathModule, TripEventsModule],
  controllers: [CheckInController],
  providers: [CheckInService, CheckInRepository],
})
export class CheckInModule {}

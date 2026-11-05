import { Module } from '@nestjs/common';
import { LevelsModule } from '../levels/levels.module.js';
import { TripPlanModule } from '../trip-plan/trip-plan.module.js';
import { TripEventsController } from './trip-events.controller.js';
import { TripEventsRepository } from './trip-events.repository.js';
import { TripEventsService } from './trip-events.service.js';

@Module({
  imports: [LevelsModule, TripPlanModule],
  controllers: [TripEventsController],
  providers: [TripEventsRepository, TripEventsService],
})
export class TripEventsModule {}

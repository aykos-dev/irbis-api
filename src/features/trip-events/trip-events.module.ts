import { Module } from '@nestjs/common';
import { GroupChatModule } from '../group-chat/group-chat.module.js';
import { LevelsModule } from '../levels/levels.module.js';
import { TripPlanModule } from '../trip-plan/trip-plan.module.js';
import { TripEventsAdminController } from './trip-events-admin.controller.js';
import { TripEventsController } from './trip-events.controller.js';
import { TripEventsRepository } from './trip-events.repository.js';
import { TripEventsService } from './trip-events.service.js';

@Module({
  imports: [LevelsModule, TripPlanModule, GroupChatModule],
  controllers: [TripEventsController, TripEventsAdminController],
  providers: [TripEventsRepository, TripEventsService],
  exports: [TripEventsService],
})
export class TripEventsModule {}

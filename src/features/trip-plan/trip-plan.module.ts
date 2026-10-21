import { Module } from '@nestjs/common';
import { PhoneCipher } from '../auth/phone-cipher.js';
import { LevelsModule } from '../levels/levels.module.js';
import {
  EmergencyContactController,
  TripPreviewController,
  TripsController,
} from './trip-plan.controller.js';
import { TripPlanRepository } from './trip-plan.repository.js';
import { TripPlanService } from './trip-plan.service.js';

@Module({
  imports: [LevelsModule],
  controllers: [
    TripPreviewController,
    EmergencyContactController,
    TripsController,
  ],
  providers: [TripPlanService, TripPlanRepository, PhoneCipher],
})
export class TripPlanModule {}

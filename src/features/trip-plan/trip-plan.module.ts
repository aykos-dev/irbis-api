import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PhoneCipher } from '../auth/phone-cipher.js';
import { LevelsModule } from '../levels/levels.module.js';
import {
  EmergencyContactController,
  TripPreviewController,
  TripsController,
} from './trip-plan.controller.js';
import { LiveController } from './live.controller.js';
import { TripActiveService } from './trip-active.service.js';
import { TripAlertJob } from './trip-alert.job.js';
import { TripPlanRepository } from './trip-plan.repository.js';
import { TripPlanService } from './trip-plan.service.js';

@Module({
  imports: [LevelsModule, AuthModule],
  controllers: [
    TripPreviewController,
    EmergencyContactController,
    TripsController,
    LiveController,
  ],
  providers: [
    TripPlanService,
    TripActiveService,
    TripPlanRepository,
    PhoneCipher,
    TripAlertJob,
  ],
})
export class TripPlanModule {}

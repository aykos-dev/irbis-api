import { Module } from '@nestjs/common';
import { AdminConditionsController } from './admin-conditions.controller.js';
import { AdminConditionsService } from './admin-conditions.service.js';
import { ConditionsController } from './conditions.controller.js';
import { ConditionsJob } from './conditions.job.js';
import { ConditionsRepository } from './conditions.repository.js';
import { ConditionsService } from './conditions.service.js';
import { OpenMeteoClient } from './open-meteo.client.js';

@Module({
  controllers: [ConditionsController, AdminConditionsController],
  providers: [
    ConditionsService,
    AdminConditionsService,
    ConditionsRepository,
    OpenMeteoClient,
    ConditionsJob,
  ],
  exports: [ConditionsService, ConditionsJob, OpenMeteoClient],
})
export class ConditionsModule {}

import { Module } from '@nestjs/common';
import { ConditionsJob } from './conditions.job.js';
import { ConditionsRepository } from './conditions.repository.js';
import { ConditionsService } from './conditions.service.js';
import { OpenMeteoClient } from './open-meteo.client.js';

@Module({
  providers: [
    ConditionsService,
    ConditionsRepository,
    OpenMeteoClient,
    ConditionsJob,
  ],
  exports: [ConditionsService, ConditionsJob],
})
export class ConditionsModule {}

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppConfig } from '../../config/app-config.js';
import {
  WEEKEND_CONDITIONS_CRON,
  WEEKEND_CONDITIONS_JOB_NAME,
  WEEKEND_CONDITIONS_TIME_ZONE,
} from './streaks.constants.js';
import { StreaksService } from './streaks.service.js';

/** AC3 (ADR-004): Saturday and Sunday 12:00 Asia/Tashkent, snapshots weekend places' condition status. */
@Injectable()
export class WeekendConditionsJob {
  private readonly logger = new Logger(WeekendConditionsJob.name);

  constructor(
    private readonly service: StreaksService,
    private readonly config: AppConfig,
  ) {}

  @Cron(WEEKEND_CONDITIONS_CRON, {
    name: WEEKEND_CONDITIONS_JOB_NAME,
    timeZone: WEEKEND_CONDITIONS_TIME_ZONE,
  })
  async handleCron(): Promise<void> {
    if (!this.config.conditionsJobEnabled) return;
    try {
      const places = await this.service.recordWeekendConditions();
      this.logger.log(
        { event: 'WEEKEND_CONDITIONS_DONE', places },
        'WEEKEND_CONDITIONS_DONE',
      );
    } catch (error: unknown) {
      // A scheduler callback has no caller to rethrow to: log it (the weekend's shield then needs a rerun).
      this.logger.error(
        { err: error, event: 'WEEKEND_CONDITIONS_FAILED' },
        'WEEKEND_CONDITIONS_FAILED',
      );
    }
  }
}

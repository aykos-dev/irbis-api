import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  CONDITIONS_CRON,
  CONDITIONS_JOB_NAME,
  CONDITIONS_TIME_ZONE,
} from './conditions.constants.js';
import { ConditionsService } from './conditions.service.js';

/** Hourly forecast fetch + recompute (ADR-004). One instance: overlapping runs are skipped in-process. */
@Injectable()
export class ConditionsJob {
  private readonly logger = new Logger(ConditionsJob.name);
  private running = false;

  constructor(private readonly service: ConditionsService) {}

  isRunning(): boolean {
    return this.running;
  }

  /** Fetches and recomputes. Resolves false (and does nothing) when a run is already in progress. */
  async runNow(): Promise<boolean> {
    if (this.running) return false;
    this.running = true;
    try {
      const summary = await this.service.refreshForecasts();
      const computed = await this.service.recomputeAll();
      this.logger.log(
        { event: 'CONDITIONS_RUN_DONE', ...summary, places: computed.length },
        'CONDITIONS_RUN_DONE',
      );
      return true;
    } finally {
      this.running = false;
    }
  }

  @Cron(CONDITIONS_CRON, {
    name: CONDITIONS_JOB_NAME,
    timeZone: CONDITIONS_TIME_ZONE,
  })
  async handleCron(): Promise<void> {
    try {
      const ran = await this.runNow();
      if (!ran) {
        this.logger.warn(
          { event: 'CONDITIONS_RUN_SKIPPED' },
          'CONDITIONS_RUN_SKIPPED',
        );
      }
    } catch (error: unknown) {
      // A scheduler callback has no caller to rethrow to: log it; the next hour retries.
      this.logger.error(
        { err: error, event: 'CONDITIONS_RUN_FAILED' },
        'CONDITIONS_RUN_FAILED',
      );
    }
  }
}

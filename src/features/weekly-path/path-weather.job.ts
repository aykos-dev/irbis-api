import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppConfig } from '../../config/app-config.js';
import type { OpenMeteoDaily } from '../conditions/condition.rules.js';
import {
  CONDITIONS_CRON,
  CONDITIONS_TIME_ZONE,
} from '../conditions/conditions.constants.js';
import {
  OpenMeteoClient,
  OpenMeteoFetchError,
  type FetchFailure,
} from '../conditions/open-meteo.client.js';
import { GameConfigService } from '../levels/game-config.service.js';
import {
  PATH_WEATHER_JOB_NAME,
  WEATHER_POINT_KEY,
} from './weekly-path.constants.js';
import { WeeklyPathRepository } from './weekly-path.repository.js';

/** Hourly, on the conditions schedule: Open-Meteo daily forecast for the path origin (`tashkent`). */
@Injectable()
export class PathWeatherJob {
  private readonly logger = new Logger(PathWeatherJob.name);

  constructor(
    private readonly client: OpenMeteoClient,
    private readonly repo: WeeklyPathRepository,
    private readonly gameConfig: GameConfigService,
    private readonly config: AppConfig,
  ) {}

  /** True when the row was refreshed; a failed fetch is logged and keeps the old row. */
  async refresh(now: Date = new Date()): Promise<boolean> {
    const { origin } = await this.gameConfig.pathConfig();
    let daily: OpenMeteoDaily;
    try {
      [daily] = await this.client.fetchDaily([
        { latitude: origin.lat, longitude: origin.lng },
      ]);
    } catch (error: unknown) {
      const status: FetchFailure =
        error instanceof OpenMeteoFetchError ? error.status : 'network';
      this.logger.warn(
        { event: 'PATH_WEATHER_FETCH_FAILED', status },
        'PATH_WEATHER_FETCH_FAILED',
      );
      return false;
    }
    await this.repo.savePointForecast(WEATHER_POINT_KEY, daily, now);
    return true;
  }

  @Cron(CONDITIONS_CRON, {
    name: PATH_WEATHER_JOB_NAME,
    timeZone: CONDITIONS_TIME_ZONE,
  })
  async handleCron(): Promise<void> {
    if (!this.config.conditionsJobEnabled) return;
    try {
      await this.refresh();
    } catch (error: unknown) {
      // A scheduler callback has no caller to rethrow to: log it; the next hour retries.
      this.logger.error(
        { err: error, event: 'PATH_WEATHER_RUN_FAILED' },
        'PATH_WEATHER_RUN_FAILED',
      );
    }
  }
}

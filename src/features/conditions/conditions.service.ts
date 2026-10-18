import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../config/app-config.js';
import {
  evaluateRules,
  hazardLevels,
  isSeasonClosed,
  nextOpenMonth,
  pastSnowCm,
  pickWeekend,
  type ForecastWindow,
} from './condition.rules.js';
import {
  ConditionsRepository,
  type ConditionInput,
  type ConditionRow,
  type ForecastRow,
} from './conditions.repository.js';
import {
  OpenMeteoClient,
  OpenMeteoFetchError,
  type FetchFailure,
} from './open-meteo.client.js';
import {
  tashkentDate,
  tashkentMonth,
  weekendWindow,
} from './weekend-window.js';

/** Stored condition plus `opensMonth` (derived from the season bar, not stored). */
export interface ComputedCondition extends ConditionRow {
  opensMonth: number | null;
}

export interface FetchSummary {
  batches: number;
  failedBatches: number;
}

@Injectable()
export class ConditionsService {
  private readonly logger = new Logger(ConditionsService.name);

  constructor(
    private readonly repo: ConditionsRepository,
    private readonly client: OpenMeteoClient,
    private readonly config: AppConfig,
  ) {}

  /**
   * Fetches the forecast for every place in batches. A failed batch keeps its previous rows and
   * is logged as CONDITIONS_FETCH_FAILED (batch index and status only).
   */
  async refreshForecasts(now: Date = new Date()): Promise<FetchSummary> {
    const places = await this.repo.listCoordinates();
    const size = this.config.openMeteo.batchSize;
    let batches = 0;
    let failedBatches = 0;
    for (let start = 0; start < places.length; start += size) {
      const batch = places.slice(start, start + size);
      const index = batches;
      batches += 1;
      let rows: ForecastRow[];
      try {
        const daily = await this.client.fetchDaily(batch);
        rows = batch.map((place, i) => ({
          placeId: place.id,
          daily: daily[i],
          fetchedAt: now,
        }));
      } catch (error: unknown) {
        failedBatches += 1;
        const status: FetchFailure =
          error instanceof OpenMeteoFetchError ? error.status : 'network';
        this.logger.warn(
          { event: 'CONDITIONS_FETCH_FAILED', batch: index, status },
          'CONDITIONS_FETCH_FAILED',
        );
        continue;
      }
      await this.repo.saveForecasts(rows);
    }
    return { batches, failedBatches };
  }

  /** Recomputes every place from stored data (no fetch). */
  async recomputeAll(now: Date = new Date()): Promise<ComputedCondition[]> {
    const computed = (await this.repo.findInputs(now)).map((input) =>
      this.compute(input, now),
    );
    await this.repo.saveConditions(computed);
    return computed;
  }

  /** Recomputes one place from stored data (no fetch). Null when the place does not exist. */
  async recomputePlace(
    placeId: string,
    now: Date = new Date(),
  ): Promise<ComputedCondition | null> {
    const [input] = await this.repo.findInputs(now, placeId);
    if (!input) return null;
    const computed = this.compute(input, now);
    await this.repo.saveConditions([computed]);
    return computed;
  }

  /** Precedence: override > closure > seasonal lock > rules. */
  private compute(input: ConditionInput, now: Date): ComputedCondition {
    const t = this.config.conditionThresholds;
    const window: ForecastWindow | null = input.forecast
      ? {
          weekend: pickWeekend(input.forecast.daily, weekendWindow(now)),
          pastSnowCm: pastSnowCm(input.forecast.daily, tashkentDate(now)),
        }
      : null;
    const base = {
      placeId: input.placeId,
      hazardLevels: hazardLevels(
        input.hazards,
        window,
        input.activeClosure !== null,
        t,
      ),
      weekend: window?.weekend ?? [],
      forecastAt: input.forecast?.fetchedAt ?? null,
      computedAt: now,
      opensMonth: null,
    };
    if (input.activeOverride) {
      return {
        ...base,
        status: input.activeOverride.status,
        source: 'manual',
        reasons: [{ code: 'OVERRIDE' }],
      };
    }
    if (input.activeClosure) {
      return {
        ...base,
        status: 'not_now',
        source: 'closure',
        reasons: [{ code: 'CLOSURE' }],
      };
    }
    const month = tashkentMonth(now);
    if (isSeasonClosed(input.season, month)) {
      return {
        ...base,
        status: 'seasonal_lock',
        source: 'season',
        reasons: [],
        opensMonth: nextOpenMonth(input.season, month),
      };
    }
    const outcome = window ? evaluateRules(window, input.hazards, t) : null;
    if (!outcome) {
      return { ...base, status: null, source: null, reasons: [] };
    }
    return { ...base, ...outcome };
  }
}

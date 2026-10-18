import type {
  AppConfig,
  ConditionThresholds,
} from '../../config/app-config.js';
import type { OpenMeteoDaily } from './condition.rules.js';
import type {
  ConditionInput,
  ConditionRow,
  ConditionsRepository,
  ForecastRow,
  PlaceCoordinates,
} from './conditions.repository.js';
import { ConditionsService } from './conditions.service.js';
import {
  OpenMeteoFetchError,
  type OpenMeteoClient,
} from './open-meteo.client.js';

const T: ConditionThresholds = {
  gustNotNowKmh: 60,
  precipNotNowMm: 20,
  windCautionKmh: 35,
  precipProbCautionPct: 60,
  heatCautionC: 35,
  heatNotNowC: 40,
  coldCautionC: -10,
  rainHazardCautionMm: 10,
  rainHazardNotNowMm: 30,
  snowCautionCm: 10,
  snowNotNowCm: 30,
};

// Wednesday 2026-07-15 in Tashkent; window = Sat 18 + Sun 19 July.
const NOW = new Date('2026-07-15T07:00:00Z');
const WINDY: OpenMeteoDaily = {
  time: ['2026-07-18', '2026-07-19'],
  wind_speed_10m_max: [40, 10],
};

const OPEN_ALL_YEAR = Array(12).fill('possible') as ConditionInput['season'];
const CLOSED_IN_JULY = OPEN_ALL_YEAR.map((s, i) =>
  i >= 5 && i <= 8 ? 'closed' : s,
);

function input(extra: Partial<ConditionInput> = {}): ConditionInput {
  return {
    placeId: 'place_1',
    season: OPEN_ALL_YEAR,
    hazards: ['road'],
    forecast: { daily: WINDY, fetchedAt: NOW },
    activeOverride: null,
    activeClosure: null,
    ...extra,
  };
}

function setup(opts: {
  inputs?: ConditionInput[];
  places?: PlaceCoordinates[];
  fetchDaily?: OpenMeteoClient['fetchDaily'];
}) {
  const saved: ConditionRow[] = [];
  const forecasts: ForecastRow[] = [];
  const repo: Pick<
    ConditionsRepository,
    'listCoordinates' | 'saveForecasts' | 'findInputs' | 'saveConditions'
  > = {
    listCoordinates: () => Promise.resolve(opts.places ?? []),
    saveForecasts: (rows) => {
      forecasts.push(...rows);
      return Promise.resolve();
    },
    findInputs: () => Promise.resolve(opts.inputs ?? []),
    saveConditions: (rows) => {
      saved.push(...rows);
      return Promise.resolve();
    },
  };
  const client: Pick<OpenMeteoClient, 'fetchDaily'> = {
    fetchDaily: opts.fetchDaily ?? (() => Promise.resolve([])),
  };
  const config: Pick<AppConfig, 'conditionThresholds' | 'openMeteo'> = {
    conditionThresholds: T,
    openMeteo: {
      baseUrl: 'http://open-meteo.test',
      apiKey: undefined,
      timeoutMs: 10_000,
      batchSize: 50,
    },
  };
  const svc = new ConditionsService(
    repo as ConditionsRepository,
    client as OpenMeteoClient,
    config as AppConfig,
  );
  return { svc, saved, forecasts };
}

describe('ConditionsService precedence (AC3)', () => {
  it('override beats closure, closure beats season, season beats rules', async () => {
    const override = { id: 'o1', status: 'go' as const };
    const closure = { id: 'c1' };
    const { svc } = setup({
      inputs: [
        input({
          placeId: 'a',
          activeOverride: override,
          activeClosure: closure,
          season: CLOSED_IN_JULY,
        }),
        input({ placeId: 'b', activeClosure: closure, season: CLOSED_IN_JULY }),
        input({ placeId: 'c', season: CLOSED_IN_JULY }),
        input({ placeId: 'd' }),
      ],
    });
    const [a, b, c, d] = await svc.recomputeAll(NOW);
    expect(a).toMatchObject({
      status: 'go',
      source: 'manual',
      reasons: [{ code: 'OVERRIDE' }],
    });
    expect(a.hazardLevels).toEqual([{ hazard: 'road', level: 'closed' }]);
    expect(b).toMatchObject({
      status: 'not_now',
      source: 'closure',
      reasons: [{ code: 'CLOSURE' }],
    });
    expect(c).toMatchObject({
      status: 'seasonal_lock',
      source: 'season',
      opensMonth: 10,
    });
    expect(d).toMatchObject({
      status: 'caution',
      source: 'forecast',
      opensMonth: null,
    });
    expect(d.reasons).toEqual([{ code: 'WIND', day: 'sat', value: 40 }]);
    // Weekend is filled from the forecast in every case.
    expect(a.weekend.map((w) => w.day)).toEqual(['sat', 'sun']);
  });

  it('leaves status and source null without a forecast; recomputePlace saves one row', async () => {
    const { svc, saved } = setup({ inputs: [input({ forecast: null })] });
    const row = await svc.recomputePlace('place_1', NOW);
    expect(row).toMatchObject({
      status: null,
      source: null,
      weekend: [],
      forecastAt: null,
    });
    expect(saved).toHaveLength(1);
  });
});

describe('ConditionsService.refreshForecasts (AC1)', () => {
  it('fetches in batches of 50 and keeps old forecasts for a failed batch', async () => {
    const places = Array.from({ length: 120 }, (_, i) => ({
      id: `place_${i}`,
      latitude: 41,
      longitude: 69,
    }));
    const batchSizes: number[] = [];
    const { svc, forecasts } = setup({
      places,
      fetchDaily: (coords) => {
        batchSizes.push(coords.length);
        if (batchSizes.length === 2)
          return Promise.reject(new OpenMeteoFetchError(503));
        return Promise.resolve(coords.map(() => WINDY));
      },
    });
    const summary = await svc.refreshForecasts(NOW);
    expect(batchSizes).toEqual([50, 50, 20]);
    expect(summary).toEqual({ batches: 3, failedBatches: 1 });
    // Batch 2 (places 50–99) was not overwritten.
    expect(forecasts.map((f) => f.placeId)).toEqual([
      ...places.slice(0, 50).map((p) => p.id),
      ...places.slice(100).map((p) => p.id),
    ]);
  });
});

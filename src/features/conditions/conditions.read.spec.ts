import type { AppConfig } from '../../config/app-config.js';
import { PlaceNotFoundError } from '../places/places.errors.js';
import { AdminConditionsService } from './admin-conditions.service.js';
import type { ConditionsJob } from './conditions.job.js';
import type {
  ConditionsRepository,
  OverrideRecord,
  PlaceConditionView,
} from './conditions.repository.js';
import { ConditionsService } from './conditions.service.js';
import type { OpenMeteoClient } from './open-meteo.client.js';

// July in Tashkent; the place is closed June–September, so it opens in October.
const NOW = new Date('2026-07-15T07:00:00Z');
const SEASON = Array.from({ length: 12 }, (_, i) =>
  i >= 5 && i <= 8 ? ('closed' as const) : ('possible' as const),
);
const OVERRIDE_TEXT = {
  uz: 'guest_reason_uz',
  ru: null,
  en: 'guest_reason_en',
};
const CLOSURE_TEXT = { uz: 'closure_reason_uz', ru: null, en: null };

function view(
  condition: Partial<NonNullable<PlaceConditionView['condition']>> | null,
): PlaceConditionView {
  return {
    placeId: 'place_1',
    season: SEASON,
    condition: condition && {
      status: 'go',
      source: 'forecast',
      reasons: [],
      hazardLevels: [],
      weekend: [],
      forecastAt: NOW,
      computedAt: NOW,
      ...condition,
    },
    activeOverrideReason: OVERRIDE_TEXT,
    activeClosureReason: CLOSURE_TEXT,
  };
}

function conditions(found: PlaceConditionView | null): ConditionsService {
  const repo: Pick<ConditionsRepository, 'findConditionView'> = {
    findConditionView: () => Promise.resolve(found),
  };
  return new ConditionsService(
    repo as ConditionsRepository,
    {} as OpenMeteoClient,
    {} as AppConfig,
  );
}

describe('ConditionsService.getCondition (AC4)', () => {
  it('returns the empty shape without a row and 404 for an unknown place', async () => {
    await expect(
      conditions(view(null)).getCondition('place_1', NOW),
    ).resolves.toEqual({
      placeId: 'place_1',
      status: null,
      source: null,
      reasons: [],
      text: null,
      opensMonth: null,
      hazards: [],
      weekend: [],
      forecastAt: null,
      computedAt: null,
    });
    await expect(
      conditions(null).getCondition('place_1', NOW),
    ).rejects.toBeInstanceOf(PlaceNotFoundError);
  });

  it('shows the reason text only for closure/manual and derives opensMonth for a seasonal lock', async () => {
    const read = (c: Parameters<typeof view>[0]) =>
      conditions(view(c)).getCondition('place_1', NOW);
    expect((await read({ status: 'not_now', source: 'manual' })).text).toEqual(
      OVERRIDE_TEXT,
    );
    expect((await read({ status: 'not_now', source: 'closure' })).text).toEqual(
      CLOSURE_TEXT,
    );
    expect((await read({ status: 'go', source: 'forecast' })).text).toBeNull();
    const locked = await read({ status: 'seasonal_lock', source: 'season' });
    expect(locked).toMatchObject({ opensMonth: 10, text: null });
    expect((await read({ status: 'go' })).opensMonth).toBeNull();
  });
});

describe('AdminConditionsService.createOverride (AC5)', () => {
  it('accepts expiresAt in (now, now + 14 d] only', async () => {
    const created: OverrideRecord = {
      id: 'override_1',
      placeId: 'place_1',
      status: 'go',
      reason: OVERRIDE_TEXT,
      expiresAt: NOW,
      createdAt: NOW,
      endedAt: null,
    };
    const repo: Pick<ConditionsRepository, 'placeExists' | 'replaceOverride'> =
      {
        placeExists: () => Promise.resolve(true),
        replaceOverride: (data) =>
          Promise.resolve({ ...created, expiresAt: data.expiresAt }),
      };
    const recompute: Pick<ConditionsService, 'recomputePlace'> = {
      recomputePlace: () => Promise.resolve(null),
    };
    const svc = new AdminConditionsService(
      repo as ConditionsRepository,
      recompute as ConditionsService,
      {} as ConditionsJob,
    );
    const at = (ms: number) =>
      svc.createOverride(
        'admin_1',
        'place_1',
        { status: 'go', reason: OVERRIDE_TEXT, expiresAt: new Date(ms) },
        NOW,
      );
    const max = NOW.getTime() + 14 * 24 * 60 * 60 * 1000;
    await expect(at(max)).resolves.toMatchObject({ active: true });
    await expect(at(max + 1)).rejects.toMatchObject({
      fieldErrors: { expiresAt: ['withinMaxDays'] },
    });
    await expect(at(NOW.getTime())).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
  });
});

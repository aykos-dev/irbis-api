import type { ConditionThresholds } from '../../config/app-config.js';
import type { WeekendDay } from './conditions.constants.js';
import {
  evaluateRules,
  hazardLevels,
  nextOpenMonth,
  pickWeekend,
} from './condition.rules.js';
import { weekendWindow } from './weekend-window.js';

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

const day = (extra: Partial<WeekendDay> = {}): WeekendDay => ({
  date: '2026-10-24',
  day: 'sat',
  weatherCode: 1,
  tMaxC: 20,
  tMinC: 5,
  windKmh: 10,
  gustKmh: 20,
  precipMm: 0,
  precipProbPct: 0,
  snowCm: 0,
  ...extra,
});

const win = (days: WeekendDay[], pastSnowCm = 0) => ({
  weekend: days,
  pastSnowCm,
});

describe('weekendWindow (AC2)', () => {
  // 2026-10-19 is a Monday. 19:30 UTC is already the next day in Tashkent (UTC+5).
  it.each([
    ['2026-10-19T06:00:00Z', ['2026-10-24/sat', '2026-10-25/sun']],
    ['2026-10-23T19:30:00Z', ['2026-10-24/sat', '2026-10-25/sun']],
    ['2026-10-24T12:00:00Z', ['2026-10-24/sat', '2026-10-25/sun']],
    ['2026-10-25T12:00:00Z', ['2026-10-25/sun']],
  ])('%s → %j', (now, expected) => {
    expect(
      weekendWindow(new Date(now)).map((d) => `${d.date}/${d.day}`),
    ).toEqual(expected);
  });
});

describe('evaluateRules (AC2)', () => {
  it('applies thresholds at the boundary (wind 34/35, gust 59/60), rounding values', () => {
    expect(evaluateRules(win([day({ windKmh: 34 })]), [], T)).toEqual({
      status: 'go',
      source: 'forecast',
      reasons: [{ code: 'GOOD_WEATHER', day: 'sat', value: 34 }],
    });
    expect(
      evaluateRules(win([day({ windKmh: 35, gustKmh: 59 })]), [], T)?.status,
    ).toBe('caution');
    const gust = evaluateRules(win([day({ windKmh: 35, gustKmh: 60 })]), [], T);
    expect(gust?.status).toBe('not_now');
    expect(gust?.reasons[0]).toEqual({ code: 'GUSTS', day: 'sat', value: 60 });
    const daily = { time: ['2026-10-24'], wind_speed_10m_max: [34.6] };
    expect(
      pickWeekend(daily, [{ date: '2026-10-24', day: 'sat' }])[0].windKmh,
    ).toBe(35);
  });

  it('applies hazard rules only when the place has the hazard, sorts worst first, max 3', () => {
    const rainy = [
      day({ precipMm: 12 }),
      day({ date: '2026-10-25', day: 'sun', precipMm: 31 }),
    ];
    expect(evaluateRules(win(rainy), [], T)).toMatchObject({
      status: 'not_now',
      source: 'forecast',
      reasons: [{ code: 'HEAVY_PRECIP', day: 'sun', value: 31 }],
    });
    const withHazards = evaluateRules(win(rainy), ['mudslide', 'flood'], T);
    expect(withHazards?.source).toBe('hazard_rule');
    expect(withHazards?.reasons).toEqual([
      { code: 'HEAVY_PRECIP', day: 'sun', value: 31 },
      { code: 'MUDSLIDE_RISK', day: 'sun', value: 31 },
      { code: 'FLOOD_RISK', day: 'sun', value: 31 },
    ]);
    // Avalanche: past 3 days + window snowfall, no day.
    expect(
      evaluateRules(win([day({ snowCm: 5 })], 25), ['avalanche'], T),
    ).toEqual({
      status: 'not_now',
      source: 'hazard_rule',
      reasons: [{ code: 'AVALANCHE_RISK', value: 30 }],
    });
  });

  it('maps hazard levels by the same bands; road is open unless closed', () => {
    const w = win([day({ precipMm: 10, tMaxC: 41 })], 30);
    expect(
      hazardLevels(['flood', 'heat', 'avalanche', 'road'], w, false, T),
    ).toEqual([
      { hazard: 'flood', level: 'raised' },
      { hazard: 'heat', level: 'high' },
      { hazard: 'avalanche', level: 'high' },
      { hazard: 'road', level: 'open' },
    ]);
    expect(hazardLevels(['mudslide', 'road'], null, true, T)).toEqual([
      { hazard: 'road', level: 'closed' },
    ]);
  });
});

describe('nextOpenMonth (AC3)', () => {
  it('wraps around the year and is null when every month is closed', () => {
    const season = Array.from({ length: 12 }, (_, i) =>
      i === 0 || i >= 10 ? ('possible' as const) : ('closed' as const),
    );
    expect(nextOpenMonth(season, 6)).toBe(11);
    expect(
      nextOpenMonth(['closed', ...season.slice(1, 11), 'closed'], 12),
    ).toBe(11);
    expect(nextOpenMonth(Array(12).fill('closed'), 3)).toBeNull();
  });
});

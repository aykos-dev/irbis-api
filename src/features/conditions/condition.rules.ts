import type { ConditionThresholds } from '../../config/app-config.js';
import type {
  HazardCode,
  SeasonStatusCode,
} from '../places/places.constants.js';
import {
  MAX_REASONS,
  OPEN_METEO_PAST_DAYS,
  THUNDERSTORM_CODES,
  type HazardLevel,
  type HazardLevelCode,
  type OpenMeteoDailyKey,
  type Reason,
  type WeekendDay,
} from './conditions.constants.js';
import type { WindowDay } from './weekend-window.js';

/** Open-Meteo `daily` block as stored in PlaceForecast: one array entry per date in `time`. */
export type OpenMeteoDaily = { time: string[] } & Partial<
  Record<OpenMeteoDailyKey, (number | null)[]>
>;

export type RuleStatus = 'go' | 'caution' | 'not_now';
export type RuleSource = 'forecast' | 'hazard_rule';

export interface RuleOutcome {
  status: RuleStatus;
  source: RuleSource;
  reasons: Reason[];
}

export interface ForecastWindow {
  weekend: WeekendDay[];
  /** Snowfall of the days before today (up to 3), cm. */
  pastSnowCm: number;
}

type Severity = 0 | 1 | 2;
const SEVERITY_STATUS: Record<Severity, RuleStatus> = {
  0: 'go',
  1: 'caution',
  2: 'not_now',
};
const BAND_LEVEL: Record<Severity, HazardLevelCode> = {
  0: 'low',
  1: 'raised',
  2: 'high',
};
const DAY_ORDER = { sat: 0, sun: 1 } as const;

interface Finding {
  reason: Reason;
  severity: Severity;
  hazardRule: boolean;
}

const value = (
  daily: OpenMeteoDaily,
  key: OpenMeteoDailyKey,
  index: number,
): number => Math.round(daily[key]?.[index] ?? 0);

/** Window days found in the forecast, values rounded. Missing values count as 0. */
export function pickWeekend(
  daily: OpenMeteoDaily,
  window: readonly WindowDay[],
): WeekendDay[] {
  return window.flatMap(({ date, day }) => {
    const i = daily.time.indexOf(date);
    if (i < 0) return [];
    return [
      {
        date,
        day,
        weatherCode: value(daily, 'weather_code', i),
        tMaxC: value(daily, 'temperature_2m_max', i),
        tMinC: value(daily, 'temperature_2m_min', i),
        windKmh: value(daily, 'wind_speed_10m_max', i),
        gustKmh: value(daily, 'wind_gusts_10m_max', i),
        precipMm: value(daily, 'precipitation_sum', i),
        precipProbPct: value(daily, 'precipitation_probability_max', i),
        snowCm: value(daily, 'snowfall_sum', i),
      },
    ];
  });
}

/** Snowfall sum (cm) of the last 3 forecast days before `today` (YYYY-MM-DD). */
export function pastSnowCm(daily: OpenMeteoDaily, today: string): number {
  const snow = daily.snowfall_sum ?? [];
  return daily.time
    .map((date, i) => ({ date, cm: snow[i] ?? 0 }))
    .filter(({ date }) => date < today)
    .slice(-OPEN_METEO_PAST_DAYS)
    .reduce((sum, { cm }) => sum + cm, 0);
}

/** 0 below `caution`, 1 from `caution`, 2 from `notNow` (inclusive, values above). */
function band(v: number, caution: number, notNow: number): Severity {
  if (v >= notNow) return 2;
  if (v >= caution) return 1;
  return 0;
}

function avalancheCm(window: ForecastWindow): number {
  return Math.round(
    window.pastSnowCm + window.weekend.reduce((sum, d) => sum + d.snowCm, 0),
  );
}

function weatherFindings(
  day: WeekendDay,
  t: ConditionThresholds,
  skipHeat: boolean,
): Finding[] {
  const out: Finding[] = [];
  const add = (code: Reason['code'], severity: Severity, v: number): void => {
    out.push({
      reason: { code, day: day.day, value: v },
      severity,
      hazardRule: false,
    });
  };
  if (THUNDERSTORM_CODES.has(day.weatherCode))
    add('THUNDERSTORM', 2, day.weatherCode);
  if (day.gustKmh >= t.gustNotNowKmh) add('GUSTS', 2, day.gustKmh);
  if (day.precipMm >= t.precipNotNowMm) add('HEAVY_PRECIP', 2, day.precipMm);
  if (day.windKmh >= t.windCautionKmh) add('WIND', 1, day.windKmh);
  if (day.precipProbPct >= t.precipProbCautionPct)
    add('PRECIP_LIKELY', 1, day.precipProbPct);
  if (!skipHeat && day.tMaxC >= t.heatCautionC) add('HEAT', 1, day.tMaxC);
  if (day.tMinC <= t.coldCautionC) add('COLD', 1, day.tMinC);
  return out;
}

function hazardFindings(
  hazards: readonly HazardCode[],
  window: ForecastWindow,
  t: ConditionThresholds,
): Finding[] {
  const out: Finding[] = [];
  const has = (h: HazardCode): boolean => hazards.includes(h);
  for (const day of window.weekend) {
    const rain = band(
      day.precipMm,
      t.rainHazardCautionMm,
      t.rainHazardNotNowMm,
    );
    if (rain > 0 && has('mudslide')) {
      out.push({
        reason: { code: 'MUDSLIDE_RISK', day: day.day, value: day.precipMm },
        severity: rain,
        hazardRule: true,
      });
    }
    if (rain > 0 && has('flood')) {
      out.push({
        reason: { code: 'FLOOD_RISK', day: day.day, value: day.precipMm },
        severity: rain,
        hazardRule: true,
      });
    }
    const heat = band(day.tMaxC, t.heatCautionC, t.heatNotNowC);
    if (heat > 0 && has('heat')) {
      out.push({
        reason: { code: 'HEAT', day: day.day, value: day.tMaxC },
        severity: heat,
        hazardRule: true,
      });
    }
  }
  if (has('avalanche')) {
    const cm = avalancheCm(window);
    const snow = band(cm, t.snowCautionCm, t.snowNotNowCm);
    if (snow > 0) {
      out.push({
        reason: { code: 'AVALANCHE_RISK', value: cm },
        severity: snow,
        hazardRule: true,
      });
    }
  }
  return out;
}

/**
 * Weather + place-hazard rules over the weekend window. Worst day wins; reasons worst first
 * (then Sat before Sun), at most 3. Null when the forecast has none of the window days.
 */
export function evaluateRules(
  window: ForecastWindow,
  hazards: readonly HazardCode[],
  t: ConditionThresholds,
): RuleOutcome | null {
  if (window.weekend.length === 0) return null;
  const findings = [
    ...window.weekend.flatMap((day) =>
      weatherFindings(day, t, hazards.includes('heat')),
    ),
    ...hazardFindings(hazards, window, t),
  ];
  if (findings.length === 0) {
    return {
      status: 'go',
      source: 'forecast',
      reasons: [
        {
          code: 'GOOD_WEATHER',
          day: window.weekend[0].day,
          value: Math.max(...window.weekend.map((d) => d.windKmh)),
        },
      ],
    };
  }
  const dayRank = (r: Reason): number => (r.day ? DAY_ORDER[r.day] : -1);
  const sorted = findings
    .map((finding, index) => ({ finding, index }))
    .sort(
      (a, b) =>
        b.finding.severity - a.finding.severity ||
        dayRank(a.finding.reason) - dayRank(b.finding.reason) ||
        a.index - b.index,
    )
    .map(({ finding }) => finding);
  const worst = sorted[0].severity;
  const hazardSetWorst = sorted.some(
    (f) => f.severity === worst && f.hazardRule,
  );
  return {
    status: SEVERITY_STATUS[worst],
    source: hazardSetWorst ? 'hazard_rule' : 'forecast',
    reasons: sorted.slice(0, MAX_REASONS).map((f) => f.reason),
  };
}

/**
 * Level per place hazard: low / raised / high by the same bands as the rules; road is open or
 * closed (active closure). Weather hazards are left out when there is no forecast window.
 */
export function hazardLevels(
  hazards: readonly HazardCode[],
  window: ForecastWindow | null,
  roadClosed: boolean,
  t: ConditionThresholds,
): HazardLevel[] {
  return hazards.flatMap((hazard): HazardLevel[] => {
    if (hazard === 'road') {
      return [{ hazard, level: roadClosed ? 'closed' : 'open' }];
    }
    if (window === null || window.weekend.length === 0) return [];
    const maxOf = (pick: (d: WeekendDay) => number): number =>
      Math.max(...window.weekend.map(pick));
    switch (hazard) {
      case 'mudslide':
      case 'flood':
        return [
          {
            hazard,
            level:
              BAND_LEVEL[
                band(
                  maxOf((d) => d.precipMm),
                  t.rainHazardCautionMm,
                  t.rainHazardNotNowMm,
                )
              ],
          },
        ];
      case 'heat':
        return [
          {
            hazard,
            level:
              BAND_LEVEL[
                band(
                  maxOf((d) => d.tMaxC),
                  t.heatCautionC,
                  t.heatNotNowC,
                )
              ],
          },
        ];
      case 'avalanche':
        return [
          {
            hazard,
            level:
              BAND_LEVEL[
                band(avalancheCm(window), t.snowCautionCm, t.snowNotNowCm)
              ],
          },
        ];
    }
  });
}

/**
 * Next month (1–12) after `month` that is not `closed` in the 12-entry season bar, wrapping
 * around the year. Null when every month is closed.
 */
export function nextOpenMonth(
  season: readonly SeasonStatusCode[],
  month: number,
): number | null {
  for (let step = 1; step <= 12; step += 1) {
    const candidate = ((month - 1 + step) % 12) + 1;
    if (season[candidate - 1] !== 'closed') return candidate;
  }
  return null;
}

/** True when the season bar is set and marks `month` (1–12) as closed. */
export function isSeasonClosed(
  season: readonly SeasonStatusCode[],
  month: number,
): boolean {
  return season.length === 12 && season[month - 1] === 'closed';
}

import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../config/app-config.js';
import type { OpenMeteoDaily } from './condition.rules.js';
import {
  OPEN_METEO_DAILY,
  OPEN_METEO_FORECAST_DAYS,
  OPEN_METEO_PAST_DAYS,
} from './conditions.constants.js';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Why a batch failed: the HTTP status, or what went wrong before one arrived. Never carries the URL (it may hold a key). */
export type FetchFailure = number | 'timeout' | 'network' | 'invalid_response';

export class OpenMeteoFetchError extends Error {
  constructor(readonly status: FetchFailure) {
    super(`Open-Meteo request failed: ${String(status)}`);
    this.name = 'OpenMeteoFetchError';
  }
}

interface LocationResponse {
  daily?: unknown;
}

function isDaily(value: unknown): value is OpenMeteoDaily {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { time?: unknown }).time)
  );
}

/** Open-Meteo forecast API (ADR-004). One call returns the daily forecast for many coordinates. */
@Injectable()
export class OpenMeteoClient {
  constructor(private readonly config: AppConfig) {}

  /** Daily forecasts in the same order as `coords`. Throws OpenMeteoFetchError on any failure. */
  async fetchDaily(coords: readonly Coordinates[]): Promise<OpenMeteoDaily[]> {
    const { baseUrl, apiKey, timeoutMs } = this.config.openMeteo;
    const url = new URL('/v1/forecast', baseUrl);
    url.searchParams.set('latitude', coords.map((c) => c.latitude).join(','));
    url.searchParams.set('longitude', coords.map((c) => c.longitude).join(','));
    url.searchParams.set('daily', OPEN_METEO_DAILY.join(','));
    url.searchParams.set('timezone', 'Asia/Tashkent');
    url.searchParams.set('past_days', String(OPEN_METEO_PAST_DAYS));
    url.searchParams.set('forecast_days', String(OPEN_METEO_FORECAST_DAYS));
    url.searchParams.set('wind_speed_unit', 'kmh');
    if (apiKey) url.searchParams.set('apikey', apiKey);

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (error: unknown) {
      const timedOut =
        error instanceof Error &&
        (error.name === 'TimeoutError' || error.name === 'AbortError');
      throw new OpenMeteoFetchError(timedOut ? 'timeout' : 'network');
    }
    if (!response.ok) throw new OpenMeteoFetchError(response.status);

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new OpenMeteoFetchError('invalid_response');
    }
    // A single coordinate comes back as an object, several as an array.
    const items: unknown[] = Array.isArray(body) ? body : [body];
    if (items.length !== coords.length) {
      throw new OpenMeteoFetchError('invalid_response');
    }
    return items.map((item) => {
      const daily = (item as LocationResponse | null)?.daily;
      if (!isDaily(daily)) throw new OpenMeteoFetchError('invalid_response');
      return daily;
    });
  }
}

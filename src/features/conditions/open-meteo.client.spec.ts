import type { AppConfig } from '../../config/app-config.js';
import { OpenMeteoClient, OpenMeteoFetchError } from './open-meteo.client.js';

function client(apiKey?: string): OpenMeteoClient {
  const config: Pick<AppConfig, 'openMeteo'> = {
    openMeteo: {
      baseUrl: 'http://open-meteo.test',
      apiKey,
      timeoutMs: 10_000,
      batchSize: 50,
    },
  };
  return new OpenMeteoClient(config as AppConfig);
}

const coords = Array.from({ length: 50 }, (_, i) => ({
  latitude: 41 + i / 100,
  longitude: 69,
}));

describe('OpenMeteoClient (AC1)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests 50 coordinates in one call with the daily variables', async () => {
    const urls: URL[] = [];
    vi.stubGlobal('fetch', (url: URL) => {
      urls.push(url);
      const body = coords.map(() => ({ daily: { time: ['2026-10-24'] } }));
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200 }),
      );
    });
    const result = await client().fetchDaily(coords);
    expect(result).toHaveLength(50);
    const url = urls[0];
    expect(url.pathname).toBe('/v1/forecast');
    expect(url.searchParams.get('latitude')?.split(',')).toHaveLength(50);
    expect(url.searchParams.get('daily')).toBe(
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,snowfall_sum',
    );
    expect(
      Object.fromEntries(
        ['timezone', 'past_days', 'forecast_days', 'wind_speed_unit'].map(
          (k) => [k, url.searchParams.get(k)],
        ),
      ),
    ).toEqual({
      timezone: 'Asia/Tashkent',
      past_days: '3',
      forecast_days: '7',
      wind_speed_unit: 'kmh',
    });
    expect(url.searchParams.has('apikey')).toBe(false);
  });

  it('throws OpenMeteoFetchError with the HTTP status on failure', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response('busy', { status: 429 })),
    );
    await expect(client('API_KEY').fetchDaily(coords)).rejects.toEqual(
      new OpenMeteoFetchError(429),
    );
  });
});

import type { AppConfig } from '../../config/app-config.js';
import type { OpenMeteoDaily } from '../conditions/condition.rules.js';
import {
  OpenMeteoFetchError,
  type OpenMeteoClient,
} from '../conditions/open-meteo.client.js';
import type { GameConfigService } from '../levels/game-config.service.js';
import { PathWeatherJob } from './path-weather.job.js';
import type { WeeklyPathRepository } from './weekly-path.repository.js';

const NOW = new Date('2026-10-19T06:00:00.000Z');
const DAILY: OpenMeteoDaily = { time: ['2026-10-23'], weather_code: [1] };

function setup(fetchDaily: OpenMeteoClient['fetchDaily']) {
  const saved: { key: string; daily: OpenMeteoDaily }[] = [];
  const coords: unknown[] = [];
  const client: Pick<OpenMeteoClient, 'fetchDaily'> = {
    fetchDaily: (c) => {
      coords.push(...c);
      return fetchDaily(c);
    },
  };
  const repo: Pick<WeeklyPathRepository, 'savePointForecast'> = {
    savePointForecast: (key, daily) => {
      saved.push({ key, daily });
      return Promise.resolve();
    },
  };
  const gameConfig: Pick<GameConfigService, 'pathConfig'> = {
    pathConfig: () =>
      Promise.resolve({
        nodes: 3,
        chestXp: 50,
        origin: { lat: 41.3111, lng: 69.2797 },
      }),
  };
  const job = new PathWeatherJob(
    client as OpenMeteoClient,
    repo as WeeklyPathRepository,
    gameConfig as GameConfigService,
    { conditionsJobEnabled: true } as AppConfig,
  );
  return { job, saved, coords };
}

describe('PathWeatherJob (AC7)', () => {
  it('fetches the origin and upserts the tashkent row', async () => {
    const { job, saved, coords } = setup(() => Promise.resolve([DAILY]));
    await expect(job.refresh(NOW)).resolves.toBe(true);
    expect(coords).toEqual([{ latitude: 41.3111, longitude: 69.2797 }]);
    expect(saved).toEqual([{ key: 'tashkent', daily: DAILY }]);
  });

  it('a failed fetch keeps the old row', async () => {
    const { job, saved } = setup(() =>
      Promise.reject(new OpenMeteoFetchError(503)),
    );
    await expect(job.refresh(NOW)).resolves.toBe(false);
    expect(saved).toEqual([]);
  });
});

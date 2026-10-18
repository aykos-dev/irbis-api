import { ConditionsJob } from './conditions.job.js';
import type { ConditionsService } from './conditions.service.js';

describe('ConditionsJob (AC1)', () => {
  it('skips a run while one is running, then fetches before recomputing', async () => {
    const calls: string[] = [];
    let release: () => void = () => undefined;
    const service: Pick<
      ConditionsService,
      'refreshForecasts' | 'recomputeAll'
    > = {
      refreshForecasts: () => {
        calls.push('fetch');
        return new Promise((resolve) => {
          release = () => resolve({ batches: 1, failedBatches: 0 });
        });
      },
      recomputeAll: () => {
        calls.push('recompute');
        return Promise.resolve([]);
      },
    };
    const job = new ConditionsJob(service as ConditionsService);
    const first = job.runNow();
    expect(job.isRunning()).toBe(true);
    await expect(job.runNow()).resolves.toBe(false);
    release();
    await expect(first).resolves.toBe(true);
    expect(job.isRunning()).toBe(false);
    expect(calls).toEqual(['fetch', 'recompute']);
  });
});

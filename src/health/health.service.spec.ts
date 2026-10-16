import { packageVersion } from '../config/package-version.js';
import type { HealthRepository } from './health.repository.js';
import { HealthService } from './health.service.js';

function serviceWithDb(up: boolean): HealthService {
  const repository: Pick<HealthRepository, 'isDatabaseUp'> = {
    isDatabaseUp: () => Promise.resolve(up),
  };
  return new HealthService(repository as HealthRepository);
}

describe('HealthService', () => {
  it('reports ok / up with version and ISO time when the database answers (AC1)', async () => {
    const result = await serviceWithDb(true).check();

    expect(result).toEqual({
      status: 'ok',
      db: 'up',
      version: packageVersion,
      time: expect.any(String),
    });
    expect(new Date(result.time).toISOString()).toBe(result.time);
  });

  it('reports degraded / down when the database is unreachable (AC2)', async () => {
    const result = await serviceWithDb(false).check();

    expect(result.status).toBe('degraded');
    expect(result.db).toBe('down');
    expect(result.version).toBe(packageVersion);
  });

  it('uses the package.json version', () => {
    expect(packageVersion).toMatch(/^\d+\.\d+\.\d+/);
  });
});

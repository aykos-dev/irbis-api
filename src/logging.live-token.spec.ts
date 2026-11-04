import { maskLiveToken } from './logging.js';

describe('live-link token is never logged (active-trip AC5)', () => {
  it('masks the token in the logged url and drops params; other urls stay as they are', () => {
    const live = maskLiveToken({
      url: '/v1/live/AAAAAAAAAAAAAAAAAAAAAA?x=1',
      params: { token: 'AAAAAAAAAAAAAAAAAAAAAA' },
    });
    expect(JSON.stringify(live)).not.toContain('AAAAAAAAAAAAAAAAAAAAAA');
    expect(live.url).toBe('/v1/live/[REDACTED]?x=1');
    expect(maskLiveToken({ url: '/v1/trips/current' }).url).toBe(
      '/v1/trips/current',
    );
  });
});

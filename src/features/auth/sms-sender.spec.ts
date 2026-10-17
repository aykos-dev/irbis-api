import type { AppConfig } from '../../config/app-config.js';
import { FakeSmsSender } from './sms-sender.js';

describe('FakeSmsSender', () => {
  const config = (appEnv: string, nodeEnv: string): AppConfig =>
    ({ appEnv, nodeEnv }) as AppConfig;

  it.each([
    ['staging', 'development'],
    ['prod', 'development'],
    ['local', 'production'],
  ])('refuses to be built with APP_ENV=%s NODE_ENV=%s', (appEnv, nodeEnv) => {
    expect(() => new FakeSmsSender(config(appEnv, nodeEnv))).toThrow(
      /staging or production/,
    );
  });

  it('logs only the user id and the code', async () => {
    const lines: string[] = [];
    const sender = new FakeSmsSender(config('test', 'test'));
    const logger = (
      sender as unknown as { logger: { log: (m: string) => void } }
    ).logger;
    logger.log = (message) => void lines.push(message);

    await sender.send({
      userId: 'user_1',
      phone: '+998XXXXXXXXX',
      code: '123456',
      purpose: 'password_reset',
    });
    expect(lines).toEqual(['SMS code for user user_1: 123456']);
  });
});

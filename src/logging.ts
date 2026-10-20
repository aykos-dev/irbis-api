import type { Params } from 'nestjs-pino';
import type { AppConfig } from './config/app-config.js';
import { resolveRequestId } from './common/request-id.js';

const SENSITIVE_KEYS = [
  'password',
  'newPassword',
  'currentPassword',
  'token',
  'accessToken',
  'refreshToken',
  'code',
  'otp',
  'phone',
  'recoveryPhone',
  'lat',
  'lng',
  'accessKeyId',
  'secretAccessKey',
  'credentials',
];

/** Paths pino replaces with "[REDACTED]": auth headers, cookies, and sensitive fields up to 3 levels deep. */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  ...SENSITIVE_KEYS.flatMap((key) => [key, `*.${key}`, `*.*.${key}`]),
];

const UNLOGGED_PATHS = new Set(['/health']);

export function loggerParams(config: AppConfig): Params {
  return {
    pinoHttp: {
      level: config.logLevel,
      genReqId: resolveRequestId,
      redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
      autoLogging: {
        ignore: (req) => UNLOGGED_PATHS.has((req.url ?? '').split('?')[0]),
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (
          res.statusCode === 401 ||
          res.statusCode === 403 ||
          res.statusCode === 429
        )
          return 'warn';
        return 'info';
      },
    },
  };
}

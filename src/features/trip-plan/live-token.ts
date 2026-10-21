import { randomBytes } from 'node:crypto';
import { LIVE_TOKEN_BYTES } from './trip-plan.constants.js';

/** A fresh unguessable live-link token: base64url of 16 random bytes (22 characters). */
export function newLiveToken(): string {
  return randomBytes(LIVE_TOKEN_BYTES).toString('base64url');
}

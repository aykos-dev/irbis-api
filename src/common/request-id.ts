import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const REQUEST_ID_HEADER = 'x-request-id';

const SAFE_ID = /^[A-Za-z0-9._-]{8,128}$/;

/**
 * pino-http `genReqId`: reuse a well-formed incoming X-Request-Id, otherwise generate one,
 * and echo it on the response so clients can quote it.
 */
export function resolveRequestId(
  req: IncomingMessage,
  res: ServerResponse,
): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const id =
    typeof incoming === 'string' && SAFE_ID.test(incoming)
      ? incoming
      : randomUUID();
  res.setHeader('X-Request-Id', id);
  return id;
}

/** Request id assigned by pino-http (falls back to a fresh id outside an HTTP request). */
export function requestIdOf(req: { id?: unknown }): string {
  return typeof req.id === 'string' ? req.id : randomUUID();
}

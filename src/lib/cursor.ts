export type CursorPayload = Record<string, string | number | null>;

/** Opaque keyset cursor: base64url JSON. Clients must treat it as a black box. */
export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

/** Returns null when the cursor is not one this API produced. */
export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    const entries = Object.entries(parsed);
    const valid = entries.every(
      ([, value]) =>
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number',
    );
    return valid ? (parsed as CursorPayload) : null;
  } catch {
    return null;
  }
}

export interface RefreshState {
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
}

export type RefreshVerdict = 'ok' | 'invalid' | 'reused';

/**
 * A rotated token (revoked because it was exchanged) that shows up again means it was copied:
 * the whole family must die. A token revoked by sign-out, block or reset is simply invalid.
 */
export function classifyRefresh(
  token: RefreshState | null,
  now: Date,
): RefreshVerdict {
  if (!token) return 'invalid';
  if (token.revokedAt) return token.replacedById ? 'reused' : 'invalid';
  if (token.expiresAt.getTime() <= now.getTime()) return 'invalid';
  return 'ok';
}

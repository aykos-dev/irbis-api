export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

export const RESERVED_USERNAMES: readonly string[] = [
  'admin',
  'irbis',
  'support',
  'moderator',
  'root',
  'system',
  'official',
];

export type UsernameProblem =
  'tooShort' | 'tooLong' | 'badCharacters' | 'dotAtEdge' | 'reserved';

/** Usernames are case-insensitive: they are stored, compared and shown lowercase. */
export function normalizeUsername(raw: string): string {
  return raw.toLowerCase();
}

/** First rule broken by an already-normalized username, or null when it is acceptable. */
export function usernameProblem(username: string): UsernameProblem | null {
  if (username.length < USERNAME_MIN) return 'tooShort';
  if (username.length > USERNAME_MAX) return 'tooLong';
  if (!/^[a-z0-9._]+$/.test(username)) return 'badCharacters';
  if (username.startsWith('.') || username.endsWith('.')) return 'dotAtEdge';
  if (isReservedUsername(username)) return 'reserved';
  return null;
}

/** Reserved names also block lookalikes that only add dots or underscores (`ad.min`, `support_`). */
export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.includes(username.replace(/[._]/g, ''));
}

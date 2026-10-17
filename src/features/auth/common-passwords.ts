import { readFileSync } from 'node:fs';

let cached: ReadonlySet<string> | undefined;

/**
 * The SecLists 10k most common passwords (MIT, see the data file header), lowercase.
 * Loaded once, on first use. Lines starting with # are the licence header.
 */
export function loadCommonPasswords(): ReadonlySet<string> {
  cached ??= new Set(
    readFileSync(
      new URL('./data/common-passwords.txt', import.meta.url),
      'utf8',
    )
      .split('\n')
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line.length > 0 && !line.startsWith('#')),
  );
  return cached;
}

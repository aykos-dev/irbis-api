import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Nearest package.json above this file — works from src/, dist/ and compiled scripts alike. */
function findPackageJson(start: string): string {
  let dir = start;
  while (!existsSync(join(dir, 'package.json'))) {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error('package.json not found');
    }
    dir = parent;
  }
  return join(dir, 'package.json');
}

/** The API version reported by /health and the OpenAPI document — the package.json version. */
export const packageVersion: string = (
  JSON.parse(
    readFileSync(
      findPackageJson(dirname(fileURLToPath(import.meta.url))),
      'utf8',
    ),
  ) as { version: string }
).version;

import { describe, expect, it } from 'vitest';
import { BADGES } from './badges.catalog.js';

describe('badge catalogue', () => {
  it('contains the approved 64 badges in the five exact group totals', () => {
    expect(BADGES).toHaveLength(64);
    expect(BADGES.filter(badge => badge.group === 'places')).toHaveLength(15);
    expect(BADGES.filter(badge => badge.group === 'regions')).toHaveLength(12);
    expect(BADGES.filter(badge => badge.group === 'seasons')).toHaveLength(8);
    expect(BADGES.filter(badge => badge.group === 'social')).toHaveLength(10);
    expect(BADGES.filter(badge => badge.group === 'milestones')).toHaveLength(19);
  });

  it('keeps every badge name as the same English proper noun in all locales', () => {
    for (const badge of BADGES) {
      expect(badge.title.uz).toBe(badge.title.en);
      expect(badge.title.ru).toBe(badge.title.en);
    }
  });

  it('has unique stable keys', () => {
    expect(new Set(BADGES.map(badge => badge.key)).size).toBe(64);
  });
});

import {
  cleanPlaceName,
  difficultyFromElevation,
  placeSlug,
  requiredLevelFor,
  toSeedRow,
  toSeedRows,
} from './place-seed.rules.js';
import { modifiedLocations } from './places.data.js';

describe('place seed rules (AC1)', () => {
  it('cleans parenthesised heights from names and builds the slug from name + elevation', () => {
    expect(cleanPlaceName('Qorangur (2943 m.)')).toBe('Qorangur');
    expect(cleanPlaceName("Chuquraq (27 m.) (Kelin Ko'ylak)")).toBe(
      "Chuquraq (Kelin Ko'ylak)",
    );
    expect(cleanPlaceName('Bayroq (2285m)')).toBe('Bayroq');
    expect(cleanPlaceName('Qurdupur (100 m)')).toBe('Qurdupur');
    expect(placeSlug('Qorangur', 2941)).toBe('qorangur-2941');
    expect(placeSlug("Chuquraq (Kelin Ko'ylak)", 1023)).toBe(
      'chuquraq-kelin-koylak-1023',
    );
    expect(placeSlug('Oʻrta ‘Tosh’', 10)).toBe('orta-tosh-10');
  });

  it('maps elevation to difficulty and difficulty to required level at the boundaries', () => {
    expect(
      [1499, 1500, 2499, 2500, 3199, 3200, 3799, 3800].map(
        difficultyFromElevation,
      ),
    ).toEqual([1, 2, 2, 3, 3, 4, 4, 5]);
    expect([1, 2, 3, 4, 5].map(requiredLevelFor)).toEqual([1, 2, 3, 5, 7]);
    expect(
      toSeedRow({
        name: 'Qorangur (2943 m.)',
        latitude: 41.395485,
        longitude: 70.086964,
        descriptionMd: 'text',
        destinationCategories: ['peak'],
        elevation: 2941,
      }),
    ).toEqual({
      slug: 'qorangur-2941',
      nameUz: 'Qorangur',
      type: 'peak',
      latitude: 41.395485,
      longitude: 70.086964,
      elevationM: 2941,
      difficulty: 3,
      requiredLevel: 3,
      descriptionUz: 'text',
    });
  });

  it('turns the whole data file into 71 unique rows and fails loudly on a duplicate slug or unknown type', () => {
    expect(toSeedRows(modifiedLocations)).toHaveLength(71);
    const row = modifiedLocations[0];
    expect(() => toSeedRows([row, { ...row }])).toThrow(/Duplicate place slug/);
    expect(() =>
      toSeedRow({ ...row, destinationCategories: ['volcano'] }),
    ).toThrow(/Unknown place type/);
  });
});

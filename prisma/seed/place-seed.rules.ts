import {
  PLACE_TYPES,
  type PlaceTypeCode,
} from '../../src/features/places/places.constants.js';

/** One row of places.data.ts. */
export interface PlaceSource {
  name: string;
  latitude: number;
  longitude: number;
  descriptionMd: string | null;
  destinationCategories: string[];
  elevation: number;
}

export interface PlaceSeedRow {
  slug: string;
  nameUz: string;
  type: PlaceTypeCode;
  latitude: number;
  longitude: number;
  elevationM: number;
  difficulty: number;
  requiredLevel: number;
  descriptionUz: string | null;
}

/** Removes every parenthesised height ("(2943 m.)", "(100 m)", "(2285m)"), collapses spaces, trims. */
export function cleanPlaceName(raw: string): string {
  return raw
    .replace(/\(\s*\d+\s*m\.?\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Kebab-case ASCII of the cleaned name, then `-<elevation>`. */
export function placeSlug(cleanName: string, elevation: number): string {
  const base = cleanName
    .replace(/[ʻ‘'’]/g, '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base}-${elevation}`;
}

/** <1500 → 1, 1500–2499 → 2, 2500–3199 → 3, 3200–3799 → 4, ≥3800 → 5. */
export function difficultyFromElevation(elevationM: number): number {
  if (elevationM < 1500) return 1;
  if (elevationM < 2500) return 2;
  if (elevationM < 3200) return 3;
  if (elevationM < 3800) return 4;
  return 5;
}

const REQUIRED_LEVEL: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 5, 5: 7 };

export function requiredLevelFor(difficulty: number): number {
  const level = REQUIRED_LEVEL[difficulty];
  if (level === undefined) {
    throw new Error(`No required level for difficulty ${difficulty}`);
  }
  return level;
}

function isPlaceType(value: string | undefined): value is PlaceTypeCode {
  return (PLACE_TYPES as readonly string[]).includes(value ?? '');
}

export function toSeedRow(source: PlaceSource): PlaceSeedRow {
  const type = source.destinationCategories[0];
  if (!isPlaceType(type)) {
    throw new Error(`Unknown place type "${type}" for "${source.name}"`);
  }
  const nameUz = cleanPlaceName(source.name);
  const difficulty = difficultyFromElevation(source.elevation);
  return {
    slug: placeSlug(nameUz, source.elevation),
    nameUz,
    type,
    latitude: source.latitude,
    longitude: source.longitude,
    elevationM: source.elevation,
    difficulty,
    requiredLevel: requiredLevelFor(difficulty),
    descriptionUz: source.descriptionMd,
  };
}

/** All rows; throws on a duplicate slug so the seed never silently merges two places. */
export function toSeedRows(sources: readonly PlaceSource[]): PlaceSeedRow[] {
  const rows = sources.map(toSeedRow);
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.slug)) {
      throw new Error(`Duplicate place slug "${row.slug}"`);
    }
    seen.add(row.slug);
  }
  return rows;
}

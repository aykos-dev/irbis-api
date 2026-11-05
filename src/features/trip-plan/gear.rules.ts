import type { TripConfig } from '../levels/game-config.schema.js';
import type { PlaceTypeCode } from '../places/places.constants.js';
import {
  WATER_FILTER_PLACE_TYPES,
  type GearKey,
  type GearNote,
} from './trip-plan.constants.js';

export interface GearItem {
  key: GearKey;
  litres?: number;
  note?: GearNote;
  noteTime?: Date;
}

export interface GearInput {
  placeType: PlaceTypeCode;
  hours: number;
  /** Forecast min/max °C for the start date; null when there is no forecast for that day. */
  forecast: { minC: number | null; maxC: number | null } | null;
  sunsetAt: Date;
  backBy: Date;
  gear: TripConfig['gear'];
}

const MINUTE_MS = 60_000;

/** Water rounded up to the next 0.5 L, never below the configured minimum. */
function waterLitres(hours: number, gear: TripConfig['gear']): number {
  return Math.max(
    gear.waterMinL,
    Math.ceil(hours * gear.waterLPerHour * 2) / 2,
  );
}

/** The ordered gear list for a trip (AC5). */
export function gearList(input: GearInput): GearItem[] {
  const { forecast, gear } = input;
  const minC = forecast?.minC ?? null;
  const maxC = forecast?.maxC ?? null;
  const items: GearItem[] = [
    { key: 'water', litres: waterLitres(input.hours, gear) },
    minC !== null && minC <= gear.frostMaxC
      ? { key: 'warmLayer', note: 'frost' }
      : { key: 'warmLayer' },
    { key: 'firstAid' },
    { key: 'offlineMap' },
  ];
  if (maxC !== null && maxC >= gear.sunMinC) items.push({ key: 'sun' });
  const headlampFrom =
    input.sunsetAt.getTime() - gear.headlampWithinMinOfSunset * MINUTE_MS;
  if (input.backBy.getTime() >= headlampFrom) {
    items.push({ key: 'headlamp', note: 'sunset', noteTime: input.sunsetAt });
  }
  if (WATER_FILTER_PLACE_TYPES.includes(input.placeType)) {
    items.push({ key: 'waterFilter', note: 'streams' });
  }
  return items;
}

/** A gear list entry: a rule item, or a group trip's custom item (`custom-<n>`). */
export type PlanGearItem =
  GearItem | { key: `custom-${number}`; label: string; custom: true };

/**
 * trip-events AC6: the rule list ∪ the group trip's gear keys (deduped by key, rule items
 * first), then its custom items in order.
 */
export function withGroupGear(
  items: GearItem[],
  group: { gearKeys: string[]; customGear: string[] },
): PlanGearItem[] {
  const seen = new Set<string>(items.map((item) => item.key));
  const merged: PlanGearItem[] = [...items];
  for (const key of group.gearKeys) {
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ key: key as GearKey });
  }
  group.customGear.forEach((label, i) => {
    merged.push({ key: `custom-${i + 1}`, label, custom: true });
  });
  return merged;
}

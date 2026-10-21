/** Fixed Uzbekistan regions plus Other (profile AC1). Stored in the `home_region` enum. */
export const HOME_REGIONS = [
  'tashkent_city',
  'tashkent_region',
  'andijan',
  'bukhara',
  'fergana',
  'jizzakh',
  'karakalpakstan',
  'khorezm',
  'namangan',
  'navoiy',
  'kashkadarya',
  'samarkand',
  'syrdarya',
  'surkhandarya',
  'other',
] as const;
export type HomeRegionCode = (typeof HOME_REGIONS)[number];

export const UNITS = ['metric', 'imperial'] as const;
export type UnitsCode = (typeof UNITS)[number];

export const APPEARANCES = ['light', 'dark', 'auto'] as const;
export type AppearanceCode = (typeof APPEARANCES)[number];

export const LESSON_ICONS = [
  'compass',
  'leaf',
  'padlock',
  'cloud',
  'paw',
  'first-aid',
  'mountain',
  'waves',
  'avalanche',
  'bolt',
] as const;
export type LessonIcon = (typeof LESSON_ICONS)[number];

export const LESSON_STATUSES = ['draft', 'published'] as const;
export type LessonStatusCode = (typeof LESSON_STATUSES)[number];

export const TIER_KEY_PATTERN = /^[a-z0-9-]{1,20}$/;
export const COLOUR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export const LESSON_TEXT_MAX = 300;
export const OPTION_TEXT_MAX = 120;
export const OPTIONS_MIN = 2;
export const OPTIONS_MAX = 4;
export const QUESTIONS_MAX = 15;
export const PUBLISH_QUESTIONS_MIN = 5;
export const IMAGE_KEY_MAX = 200;
/** Upper bound for reorder lists (tiers or a tier's lessons). */
export const REORDER_IDS_MAX = 500;

export const LOCALES = ['uz', 'ru', 'en'] as const;

/** `{ uz, ru, en }` text; drafts may hold "" in any locale. */
export interface L10n {
  uz: string;
  ru: string;
  en: string;
}

/** Question images (ADR-005): upload limit, longest stored side, and the only key shape a lesson may hold. */
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_MAX_SIDE = 1600;
export const IMAGE_KEY_PATTERN = /^lessons\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

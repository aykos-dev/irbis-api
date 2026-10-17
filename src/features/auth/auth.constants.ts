export const LOCALES = ['uz', 'ru', 'en'] as const;
export type LocaleCode = (typeof LOCALES)[number];

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const BLOCK_REASON_CODES = [
  'spam',
  'harassment',
  'unsafe',
  'fake_content',
  'other',
] as const;
export type BlockReason = (typeof BLOCK_REASON_CODES)[number];

export const SMS_PURPOSES = ['password_reset', 'phone_verify'] as const;
export type SmsPurposeCode = (typeof SMS_PURPOSES)[number];

export const ADMIN_ACTIONS = [
  'block',
  'unblock',
  'set_password',
  'set_recovery_phone',
  'change_role',
] as const;
export type AdminActionCode = (typeof ADMIN_ACTIONS)[number];

export type UserStatus = 'active' | 'blocked' | 'locked';

/** Cookie that carries the admin web's refresh token (httpOnly, Secure, SameSite=Lax). */
export const ADMIN_REFRESH_COOKIE = 'irbis_admin_refresh';
export const ADMIN_REFRESH_COOKIE_PATH = '/v1/admin/auth';

/** `last_active_at` is written at most this often per user. */
export const LAST_ACTIVE_MIN_INTERVAL_MS = 3_600_000;

export const EXPERIENCES = ['beginner', 'weekend', 'experienced'] as const;
export type ExperienceCode = (typeof EXPERIENCES)[number];

export const INTERESTS = [
  'peaks',
  'caves',
  'lakes',
  'camping',
  'trails',
] as const;
export type InterestCode = (typeof INTERESTS)[number];

/** Most interests one user can pick during onboarding. */
export const MAX_INTERESTS = INTERESTS.length;

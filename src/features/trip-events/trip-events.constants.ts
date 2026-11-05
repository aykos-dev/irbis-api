/** Mirror the Prisma enums (plain unions so services stay Prisma-free). */
export const GROUP_TRIP_VISIBILITIES = ['public', 'private'] as const;
export type GroupTripVisibilityCode = (typeof GROUP_TRIP_VISIBILITIES)[number];

export const GROUP_TRIP_STATUSES = ['open', 'cancelled'] as const;
export type GroupTripStatusCode = (typeof GROUP_TRIP_STATUSES)[number];

export const GROUP_TRIP_ROLES = ['leader', 'member'] as const;
export type GroupTripRoleCode = (typeof GROUP_TRIP_ROLES)[number];

export const GROUP_TRIP_MEMBER_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'left',
] as const;
export type GroupTripMemberStatusCode =
  (typeof GROUP_TRIP_MEMBER_STATUSES)[number];

export const GROUP_TRIP_SCOPES = ['upcoming', 'mine'] as const;
export type GroupTripScope = (typeof GROUP_TRIP_SCOPES)[number];

/** A group trip may start at most this many Asia/Tashkent days after today. */
export const GROUP_TRIP_PLAN_AHEAD_DAYS = 60;
export const MEETING_TEXT_MAX = 120;
export const DESCRIPTION_MAX = 500;
export const NOTE_MAX = 200;
export const CUSTOM_GEAR_MAX_ITEMS = 8;
export const CUSTOM_GEAR_ITEM_MAX = 30;
export const CARPOOL_SEATS_MIN = 1;
export const CARPOOL_SEATS_MAX = 8;
export const MAX_PEOPLE_MIN = 2;
export const MAX_PEOPLE_MAX = 50;
export const MIN_LEVEL_MIN = 1;
export const MIN_LEVEL_MAX = 7;
export const GROUP_LINKS_MAX = 10;
export const GROUP_TRIP_PAGE_SIZE = 20;
/** Leaders at this level or above are shown as verified. */
export const VERIFIED_LEADER_LEVEL = 5;
/** HH:MM, 00:00–23:59. */
export const CARPOOL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

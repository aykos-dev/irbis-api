/** Find-buddies level filter: anyone, my level ±1, or mentors (L5+). */
export const BUDDY_LEVEL_FILTERS = ['any', 'near', 'mentors'] as const;
export type BuddyLevelFilter = (typeof BUDDY_LEVEL_FILTERS)[number];

export const BUDDY_LINK_STATUSES = ['pending', 'accepted'] as const;
export type BuddyLinkStatusCode = (typeof BUDDY_LINK_STATUSES)[number];

export const RATING_TRAITS = ['reliable', 'safety', 'company'] as const;
export type RatingTrait = (typeof RATING_TRAITS)[number];

export const FIND_PAGE_SIZE = 20;
/** Candidates considered per search, most recently active first; the sort runs over these. */
export const FIND_POOL_MAX = 1000;
/** Candidates must have been active within this many days. */
export const ACTIVE_WITHIN_DAYS = 30;
/** `near` = my level ± this. */
export const NEAR_LEVEL_SPREAD = 1;
/** Mentors and verified leaders: this level or above. */
export const MENTOR_LEVEL = 5;
export const CARD_INTERESTS_MAX = 3;
/** Ratings stay hidden until this many distinct people rated someone. */
export const RATING_MIN_RATERS = 3;
export const RATING_MIN = 1;
export const RATING_MAX = 5;
/** Attendees can rate each other until this many days after the trip's backBy. */
export const RATING_WINDOW_DAYS = 7;
export const BUDDY_TRIPS_LIMIT = 10;

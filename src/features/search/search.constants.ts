/** The Search screen's tabs. Tours ship empty until their feature lands. */
export const SEARCH_SCOPES = [
  'all',
  'places',
  'people',
  'groups',
  'tours',
  'trips',
] as const;

export type SearchScope = (typeof SEARCH_SCOPES)[number];

/** Shorter queries are not sent to the API (the app shows a hint instead). */
export const SEARCH_MIN_QUERY = 2;

/** Maximum results per scope. */
export const SEARCH_LIMIT = 10;

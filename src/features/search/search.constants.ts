/** The Search screen's five tabs. Groups and tours ship empty until their features land. */
export const SEARCH_SCOPES = [
  'all',
  'places',
  'people',
  'groups',
  'tours',
] as const;

export type SearchScope = (typeof SEARCH_SCOPES)[number];

/** Shorter queries are not sent to the API (the app shows a hint instead). */
export const SEARCH_MIN_QUERY = 2;

/** Maximum results per scope. */
export const SEARCH_LIMIT = 10;

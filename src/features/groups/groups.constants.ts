export const GROUP_VISIBILITIES = ['public', 'private'] as const;
export type GroupVisibilityCode = (typeof GROUP_VISIBILITIES)[number];

export const GROUP_MEMBER_ROLES = ['owner', 'admin', 'member'] as const;
export type GroupMemberRoleCode = (typeof GROUP_MEMBER_ROLES)[number];

export const GROUP_MEMBER_STATUSES = ['invited', 'pending', 'active'] as const;
export type GroupMemberStatusCode = (typeof GROUP_MEMBER_STATUSES)[number];

export const GROUP_NAME_MIN = 3;
export const GROUP_NAME_MAX = 80;
export const GROUP_DESCRIPTION_MAX = 300;
export const GROUP_LIST_LIMIT = 30;
export const GROUP_LARGE_MEMBER_THRESHOLD = 500;
export const GROUP_LARGE_MIN_ADMINS = 2;

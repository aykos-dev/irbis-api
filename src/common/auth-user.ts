export const ROLES = ['user', 'admin', 'operator'] as const;
export type Role = (typeof ROLES)[number];

/** The authenticated caller, taken from a verified access token. */
export interface AuthUser {
  id: string;
  role: Role;
}

export function isRole(value: unknown): value is Role {
  return (
    typeof value === 'string' && (ROLES as readonly string[]).includes(value)
  );
}

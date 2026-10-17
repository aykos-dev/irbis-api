export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 64;

export type PasswordProblem =
  'tooShort' | 'tooLong' | 'sameAsUsername' | 'tooCommon';

/**
 * First policy rule the password breaks, or null. `commonPasswords` holds lowercase entries;
 * the comparison ignores case.
 */
export function passwordProblem(
  password: string,
  username: string,
  commonPasswords: ReadonlySet<string>,
): PasswordProblem | null {
  if (password.length < PASSWORD_MIN) return 'tooShort';
  if (password.length > PASSWORD_MAX) return 'tooLong';
  const lowered = password.toLowerCase();
  if (lowered === username.toLowerCase()) return 'sameAsUsername';
  if (commonPasswords.has(lowered)) return 'tooCommon';
  return null;
}

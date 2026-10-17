const UZ_PHONE = /^\+998\d{9}$/;

/** `+998` + 9 digits after dropping spaces, dashes and brackets; null when it is not one. */
export function normalizePhone(raw: string): string | null {
  const compact = raw.replace(/[\s\-()]/g, '');
  return UZ_PHONE.test(compact) ? compact : null;
}

/** `+998 •• ••• •• 67`: only the last two digits are ever shown. */
export function maskPhone(e164: string): string {
  return `+998 •• ••• •• ${e164.slice(-2)}`;
}

import type { LocaleCode } from '../auth/auth.constants.js';
import type { DueAlert } from './trip-plan.repository.js';

/** Copy `sms.alert` (trip-plan-copy.md), server-side only. */
export const TRIP_ALERT_SMS: Record<LocaleCode, string> = {
  en: "{name} planned to be back from {place} by {time} and hasn't checked out. Last location: {link} — Irbis",
  ru: '{name} планировал(а) вернуться с {place} к {time} и не отметился(ась). Последнее место: {link} — Irbis',
  uz: '{name} {place}dan {time} gacha qaytishi kerak edi, lekin belgilamadi. Oxirgi joy: {link} — Irbis',
};

const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tashkent',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function placeName(place: DueAlert['place'], locale: LocaleCode): string {
  if (locale === 'ru') return place.nameRu ?? place.nameUz;
  if (locale === 'en') return place.nameEn ?? place.nameUz;
  return place.nameUz;
}

const isFix = (lat: unknown, lng: unknown): [number, number] | null =>
  typeof lat === 'number' && typeof lng === 'number' ? [lat, lng] : null;

/** The last ping, else the start fix, else the place's own coordinates. */
function mapLink(alert: DueAlert): string {
  const { place } = alert;
  const [lat, lng] = isFix(alert.lastLat, alert.lastLng) ??
    isFix(alert.startLat, alert.startLng) ?? [place.latitude, place.longitude];
  return mapsUrl(lat, lng);
}

/** Google Maps link to a point, 5 decimals (about 1 m). */
export function mapsUrl(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/** AC8: the alert text in the user's locale. */
export function tripAlertText(alert: DueAlert): string {
  const { locale } = alert.user;
  const values: Record<string, string> = {
    name: alert.user.displayName ?? alert.user.username,
    place: placeName(alert.place, locale),
    time: TIME_FORMAT.format(alert.backBy),
    link: mapLink(alert),
  };
  return TRIP_ALERT_SMS[locale].replace(
    /\{(name|place|time|link)\}/g,
    (_, key: string) => values[key] ?? '',
  );
}

import type { LocaleCode } from '../auth/auth.constants.js';
import { mapsUrl } from './trip-alert.sms.js';

/** Copy `sms.sos` (active-trip-copy.md), server-side only. */
export const SOS_SMS: Record<LocaleCode, string> = {
  en: 'SOS from {name} near {place}. Location: {maps}. Live: {url} — Irbis',
  ru: 'SOS от {name} у {place}. Место: {maps}. Онлайн: {url} — Irbis',
  uz: '{name}dan SOS, {place} yaqinida. Joylashuv: {maps}. Jonli: {url} — Irbis',
};

export interface SosTextInput {
  locale: LocaleCode;
  name: string;
  place: { nameUz: string; nameRu: string | null; nameEn: string | null };
  lat: number;
  lng: number;
  liveUrl: string;
}

function placeName(place: SosTextInput['place'], locale: LocaleCode): string {
  if (locale === 'ru') return place.nameRu ?? place.nameUz;
  if (locale === 'en') return place.nameEn ?? place.nameUz;
  return place.nameUz;
}

/** AC7: the SOS text in the user's locale. */
export function sosText(input: SosTextInput): string {
  const values: Record<string, string> = {
    name: input.name,
    place: placeName(input.place, input.locale),
    maps: mapsUrl(input.lat, input.lng),
    url: input.liveUrl,
  };
  return SOS_SMS[input.locale].replace(
    /\{(name|place|maps|url)\}/g,
    (_, key: string) => values[key] ?? '',
  );
}

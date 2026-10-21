const DEG = Math.PI / 180;
/** Solar zenith at apparent sunset: 90° plus refraction and the solar disc radius. */
const SUNSET_ZENITH_DEG = 90.833;
const MINUTE_MS = 60_000;

const isLeapYear = (y: number): boolean =>
  (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/**
 * Sunset at (lat, lng) on the calendar `date` (YYYY-MM-DD) as a UTC instant, using the NOAA
 * general solar position formulas (fractional year → equation of time + declination → hour angle).
 * Accurate to ~1–2 min at mid latitudes. Polar day/night clamps the hour angle (never hit in Central Asia).
 */
export function sunsetAt(lat: number, lng: number, date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const midnightUtc = Date.UTC(y, m - 1, d);
  const dayOfYear =
    Math.round((midnightUtc - Date.UTC(y, 0, 1)) / 86_400_000) + 1;
  const daysInYear = isLeapYear(y) ? 366 : 365;
  // Evaluated near local sunset (~18:00 solar time); the drift over a day is negligible.
  const g = ((2 * Math.PI) / daysInYear) * (dayOfYear - 1 + (18 - 12) / 24);

  const eqTimeMin =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);

  const phi = lat * DEG;
  const cosHa =
    Math.cos(SUNSET_ZENITH_DEG * DEG) / (Math.cos(phi) * Math.cos(decl)) -
    Math.tan(phi) * Math.tan(decl);
  const haDeg = Math.acos(Math.min(1, Math.max(-1, cosHa))) / DEG;

  const sunsetUtcMin = 720 - 4 * (lng - haDeg) - eqTimeMin;
  return new Date(midnightUtc + Math.round(sunsetUtcMin * MINUTE_MS));
}

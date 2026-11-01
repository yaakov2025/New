import 'dotenv/config';

function int(name: string, def: number): number {
  const v = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(v) && v >= 0 ? v : def;
}

/**
 * SERVER key: used only by this Node process for Geocoding, Address Validation
 * and Solar. Restrict it in Cloud Console to those 3 APIs (+ IP if you deploy).
 *
 * BROWSER key: loaded by Maps JavaScript API in the browser (unavoidable – the
 * Maps JS SDK requires a key in the page). Restrict it to HTTP referrers and to
 * Maps JavaScript API + Places API (New).
 */
export const config = {
  port: int('PORT', 3000),
  serverKey: process.env.GOOGLE_MAPS_SERVER_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
  browserKey: process.env.GOOGLE_MAPS_BROWSER_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
  /** True when one key is doing both jobs – we warn about it in the UI. */
  sharedKey:
    !process.env.GOOGLE_MAPS_BROWSER_KEY && !process.env.GOOGLE_MAPS_SERVER_KEY && !!process.env.GOOGLE_MAPS_API_KEY,
  mapId: process.env.GOOGLE_MAP_ID || 'DEMO_MAP_ID',
  expectedProjectNumber: process.env.GOOGLE_CLOUD_PROJECT_NUMBER || '31967172109',
  useAddressValidation: (process.env.USE_ADDRESS_VALIDATION ?? 'true') !== 'false',
  dataFile: process.env.DATA_FILE || 'data/store.json',
  /** Daily request caps enforced by this app (Google billing caps are separate). */
  dailyLimits: {
    solar: int('DAILY_LIMIT_SOLAR', 20),
    geocode: int('DAILY_LIMIT_GEOCODE', 100),
    addressValidation: int('DAILY_LIMIT_ADDRESS_VALIDATION', 50),
  },
};

export function redact(s: string): string {
  return String(s ?? '')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_KEY]')
    .replace(/key=[^&\s"']+/gi, 'key=[REDACTED]');
}

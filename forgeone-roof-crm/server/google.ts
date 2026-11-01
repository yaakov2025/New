// Server-side Google Maps Platform calls. The key never leaves this module:
// it is sent as the X-Goog-Api-Key header (not in URLs, so it cannot leak into
// logs or error messages).
import { config, redact } from './config.ts';
import type {
  AddressValidationSummary,
  DiagnosticStep,
  LatLng,
  SolarInsights,
  SolarSegment,
  SolarStatus,
} from '../shared/types.ts';
import { distanceMeters } from '../shared/measure.ts';

const now = () => new Date().toISOString();
const THIRTY_DAYS = 30 * 24 * 3600 * 1000;

interface GoogleErrorInfo {
  httpStatus: number;
  googleStatus?: string;
  reason?: string;
  message: string;
}

async function callGoogle(url: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; json: any }> {
  const res = await fetch(url, {
    ...init,
    headers: { 'X-Goog-Api-Key': config.serverKey, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

function parseGoogleError(status: number, json: any): GoogleErrorInfo {
  const err = json?.error ?? {};
  const details: any[] = Array.isArray(err.details) ? err.details : [];
  const info = details.find((d) => d?.reason);
  return {
    httpStatus: status,
    googleStatus: err.status,
    reason: info?.reason,
    message: redact(err.message || `HTTP ${status}`),
  };
}

function fixFor(api: string, e: { reason?: string; message?: string }): string | undefined {
  const consoleCreds = 'Google Cloud Console → APIs & Services → Credentials';
  if (e.reason === 'API_KEY_SERVICE_BLOCKED' || /not authorized to use this service/i.test(e.message ?? '')) {
    return `Your API key's "API restrictions" do not include ${api}. In ${consoleCreds}, open the server key, and under "API restrictions" tick ${api}, then Save (takes ~1–5 min).`;
  }
  if (e.reason === 'SERVICE_DISABLED' || /has not been used in project|is disabled/i.test(e.message ?? '')) {
    return `Enable ${api} for project ${config.expectedProjectNumber} in Google Cloud Console → APIs & Services → Library.`;
  }
  if (e.reason === 'API_KEY_INVALID' || /API key not valid/i.test(e.message ?? '')) {
    return `The server API key is invalid. Set GOOGLE_MAPS_SERVER_KEY in .env to a key from project ${config.expectedProjectNumber}.`;
  }
  if (e.reason === 'API_KEY_IP_ADDRESS_BLOCKED' || /IP address/i.test(e.message ?? '')) {
    return `The key has IP restrictions that exclude this server's IP. Add the server IP under "Application restrictions" in ${consoleCreds}.`;
  }
  if (e.reason === 'API_KEY_HTTP_REFERRER_BLOCKED' || /referer/i.test(e.message ?? '')) {
    return `This key is restricted to HTTP referrers (browser-only) and cannot be used server-side. Create a separate server key restricted to Geocoding, Address Validation and Solar APIs.`;
  }
  return undefined;
}

function consumerProject(json: any): string | undefined {
  const details: any[] = json?.error?.details ?? [];
  const c = details.find((d) => d?.metadata?.consumer)?.metadata?.consumer as string | undefined;
  return c?.replace('projects/', '');
}

// ---------------------------------------------------------------- Address Validation

export async function validateAddress(
  address: string,
): Promise<{ summary: AddressValidationSummary | null; placeId?: string; location?: LatLng; step: DiagnosticStep }> {
  const r = await callGoogle('https://addressvalidation.googleapis.com/v1:validateAddress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: { regionCode: 'US', addressLines: [address] }, enableUspsCass: true }),
  });
  if (!r.ok) {
    const e = parseGoogleError(r.status, r.json);
    const fix = fixFor('Address Validation API', e);
    return {
      summary: null,
      step: {
        at: now(),
        service: 'ADDRESS_VALIDATION',
        ok: false,
        httpStatus: e.httpStatus,
        googleStatus: e.googleStatus,
        reason: e.reason,
        message: `${e.message}${fix ? ` — Fix: ${fix}` : ''} (continuing with Geocoding API)`,
      },
    };
  }
  const res = r.json.result ?? {};
  const v = res.verdict ?? {};
  const loc = res.geocode?.location;
  return {
    summary: {
      formattedAddress: res.address?.formattedAddress ?? null,
      validationGranularity: v.validationGranularity ?? null,
      addressComplete: v.addressComplete ?? null,
      hasUnconfirmedComponents: v.hasUnconfirmedComponents ?? null,
      dpvConfirmation: res.uspsData?.dpvConfirmation ?? null,
    },
    placeId: res.geocode?.placeId,
    location: loc ? { lat: loc.latitude, lng: loc.longitude } : undefined,
    step: {
      at: now(),
      service: 'ADDRESS_VALIDATION',
      ok: true,
      httpStatus: 200,
      message: `Validated: ${res.address?.formattedAddress ?? '(no formatted address)'} · granularity ${v.validationGranularity ?? 'n/a'} · USPS DPV ${res.uspsData?.dpvConfirmation ?? 'n/a'}`,
    },
  };
}

// ---------------------------------------------------------------- Geocoding

export interface GeocodeResult {
  formattedAddress: string;
  placeId: string;
  location: LatLng;
  locationType: string;
  partialMatch: boolean;
}

export async function geocode(q: { address?: string; placeId?: string }): Promise<{
  result: GeocodeResult | null;
  step: DiagnosticStep;
  fix?: string;
}> {
  const params = new URLSearchParams();
  if (q.placeId) params.set('place_id', q.placeId);
  else params.set('address', q.address ?? '');
  if (!q.placeId) params.set('components', 'country:US');
  // The legacy Geocoding web service only accepts the key as a query parameter.
  // The URL is never logged; error text is passed through redact().
  params.set('key', config.serverKey);
  const r = await callGoogle(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  const status: string = r.json?.status ?? `HTTP_${r.status}`;
  if (status !== 'OK' || !r.json.results?.length) {
    const message = redact(r.json?.error_message || (status === 'ZERO_RESULTS' ? 'Address not found' : status));
    const fix = status === 'REQUEST_DENIED' ? fixFor('Geocoding API', { message }) : undefined;
    return {
      result: null,
      fix,
      step: {
        at: now(),
        service: 'GEOCODING',
        ok: false,
        httpStatus: r.status,
        googleStatus: status,
        message: `${message}${fix ? ` — Fix: ${fix}` : ''}`,
      },
    };
  }
  const g = r.json.results[0];
  const result: GeocodeResult = {
    formattedAddress: g.formatted_address,
    placeId: g.place_id,
    location: { lat: g.geometry.location.lat, lng: g.geometry.location.lng },
    locationType: g.geometry.location_type,
    partialMatch: !!g.partial_match,
  };
  return {
    result,
    step: {
      at: now(),
      service: 'GEOCODING',
      ok: true,
      httpStatus: 200,
      googleStatus: 'OK',
      message: `${result.formattedAddress} → (${result.location.lat.toFixed(6)}, ${result.location.lng.toFixed(6)}) · location_type ${result.locationType}${result.partialMatch ? ' · PARTIAL MATCH – confirm the address' : ''}`,
    },
  };
}

// ---------------------------------------------------------------- Solar API

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const ll = (p: any): LatLng | null =>
  p && typeof p.latitude === 'number' && typeof p.longitude === 'number' ? { lat: p.latitude, lng: p.longitude } : null;
const box = (b: any) => (b && ll(b.sw) && ll(b.ne) ? { sw: ll(b.sw)!, ne: ll(b.ne)! } : null);
const date = (d: any) =>
  d && d.year ? `${d.year}-${String(d.month ?? 1).padStart(2, '0')}-${String(d.day ?? 1).padStart(2, '0')}` : null;

export function parseBuildingInsights(json: any, from: LatLng): SolarInsights {
  const sp = json.solarPotential ?? {};
  const segments: SolarSegment[] = (sp.roofSegmentStats ?? []).map((s: any, i: number) => ({
    index: i,
    pitchDegrees: num(s.pitchDegrees),
    azimuthDegrees: num(s.azimuthDegrees),
    areaMeters2: num(s.stats?.areaMeters2),
    groundAreaMeters2: num(s.stats?.groundAreaMeters2),
    planeHeightAtCenterMeters: num(s.planeHeightAtCenterMeters),
    center: ll(s.center),
    boundingBox: box(s.boundingBox),
  }));
  const center = ll(json.center);
  const fetchedAt = new Date();
  return {
    buildingName: json.name ?? null,
    center,
    boundingBox: box(json.boundingBox),
    imageryDate: date(json.imageryDate),
    imageryProcessedDate: date(json.imageryProcessedDate),
    imageryQuality: json.imageryQuality ?? null,
    postalCode: json.postalCode ?? null,
    wholeRoofAreaMeters2: num(sp.wholeRoofStats?.areaMeters2),
    wholeRoofGroundAreaMeters2: num(sp.wholeRoofStats?.groundAreaMeters2),
    maxArrayPanelsCount: num(sp.maxArrayPanelsCount),
    maxArrayAreaMeters2: num(sp.maxArrayAreaMeters2),
    panelCapacityWatts: num(sp.panelCapacityWatts),
    maxSunshineHoursPerYear: num(sp.maxSunshineHoursPerYear),
    segments,
    distanceFromGeocodeMeters: center ? Math.round(distanceMeters(center, from) * 10) / 10 : null,
    fetchedAt: fetchedAt.toISOString(),
    expiresAt: new Date(fetchedAt.getTime() + THIRTY_DAYS).toISOString(),
  };
}

export async function solarBuildingInsights(
  loc: LatLng,
  onCall: () => boolean,
): Promise<{ insights: SolarInsights | null; status: SolarStatus; steps: DiagnosticStep[] }> {
  const steps: DiagnosticStep[] = [];
  // MEDIUM returns HIGH or MEDIUM imagery; BASE (expanded coverage) is the last resort.
  const attempts: Array<{ quality: string; experiments?: string }> = [
    { quality: 'MEDIUM' },
    { quality: 'BASE', experiments: 'EXPANDED_COVERAGE' },
  ];
  for (const a of attempts) {
    if (!onCall()) {
      steps.push({ at: now(), service: 'USAGE_GUARD', ok: false, message: `Daily Solar API limit (${config.dailyLimits.solar}) reached – request not sent.` });
      return {
        insights: null,
        steps,
        status: { state: 'QUOTA', message: 'Daily Solar request limit set in this app was reached.', fix: 'Raise DAILY_LIMIT_SOLAR in .env or try again tomorrow.' },
      };
    }
    const p = new URLSearchParams({
      'location.latitude': loc.lat.toFixed(7),
      'location.longitude': loc.lng.toFixed(7),
      requiredQuality: a.quality,
    });
    if (a.experiments) p.set('experiments', a.experiments);
    const r = await callGoogle(`https://solar.googleapis.com/v1/buildingInsights:findClosest?${p}`);
    if (r.ok) {
      const insights = parseBuildingInsights(r.json, loc);
      const far = (insights.distanceFromGeocodeMeters ?? 0) > 25;
      steps.push({
        at: now(),
        service: 'SOLAR_BUILDING_INSIGHTS',
        ok: true,
        httpStatus: 200,
        message: `Building ${insights.buildingName ?? '?'} · imagery ${insights.imageryQuality} ${insights.imageryDate ?? ''} · ${insights.segments.length} roofSegmentStats · wholeRoofStats.areaMeters2=${insights.wholeRoofAreaMeters2 ?? 'n/a'}${far ? ` · WARNING: building center is ${insights.distanceFromGeocodeMeters} m from the address point – confirm it is the right building` : ''}`,
      });
      return {
        insights,
        steps,
        status: {
          state: 'OK',
          message: far
            ? `Google returned a building ${insights.distanceFromGeocodeMeters} m from the address point. Confirm it is the correct structure.`
            : `Google Solar building model (${insights.imageryQuality} quality, imagery ${insights.imageryDate ?? 'date n/a'}).`,
        },
      };
    }
    const e = parseGoogleError(r.status, r.json);
    const consumer = consumerProject(r.json);
    const projectNote =
      consumer && consumer !== config.expectedProjectNumber
        ? ` NOTE: this key belongs to project ${consumer}, not ${config.expectedProjectNumber}.`
        : consumer
          ? ` (key belongs to project ${consumer})`
          : '';
    steps.push({
      at: now(),
      service: 'SOLAR_BUILDING_INSIGHTS',
      ok: false,
      httpStatus: e.httpStatus,
      googleStatus: e.googleStatus,
      reason: e.reason,
      message: `requiredQuality=${a.quality}: ${e.message}${projectNote}`,
    });
    if (r.status === 404) continue; // try next quality tier
    const fix = fixFor('Solar API', e);
    const state: SolarStatus['state'] =
      e.reason === 'API_KEY_SERVICE_BLOCKED'
        ? 'KEY_BLOCKED'
        : e.reason === 'SERVICE_DISABLED'
          ? 'API_DISABLED'
          : r.status === 429
            ? 'QUOTA'
            : 'ERROR';
    return { insights: null, steps, status: { state, message: `${e.message}${projectNote}`, fix } };
  }
  return {
    insights: null,
    steps,
    status: {
      state: 'NO_COVERAGE',
      message: 'Google Solar has no building model at this location (404 NOT_FOUND at all quality tiers).',
      fix: 'Trace the roof manually on the satellite image – all measurements will be marked MANUAL.',
    },
  };
}

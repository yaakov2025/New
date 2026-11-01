import express, { type Request, type Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config, redact } from './config.ts';
import { store } from './store.ts';
import { geocode, solarBuildingInsights, validateAddress } from './google.ts';
import {
  EDGE_TYPES,
  PENETRATION_TYPES,
  emptyTakeoff,
  type DiagnosticStep,
  type LatLng,
  type PropertyRecord,
  type Takeoff,
} from '../shared/types.ts';
import { canVerify, runChecks } from '../shared/measure.ts';

export const api = express.Router();
api.use(express.json({ limit: '2mb' }));

const THIRTY_DAYS = 30 * 24 * 3600 * 1000;
const nowIso = () => new Date().toISOString();
const id = (p: string) => `${p}_${crypto.randomBytes(5).toString('hex')}`;

api.get('/config', (_req, res) => {
  res.json({
    browserKey: config.browserKey || null, // Maps JS requires a browser key; restrict it by HTTP referrer
    mapId: config.mapId,
    serverKeyConfigured: !!config.serverKey,
    sharedKeyWarning: config.sharedKey,
    expectedProjectNumber: config.expectedProjectNumber,
  });
});

/**
 * First-run setup: paste one Google key in the browser, it is written to the
 * local .env (git-ignored) and used immediately. Only allowed while no key is
 * configured and only from this machine (localhost).
 */
api.post('/setup', (req, res) => {
  const ip = req.socket.remoteAddress ?? '';
  // GitHub Codespaces forwards a private port that only the codespace owner can open.
  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip) || process.env.CODESPACES === 'true';
  if (config.serverKey || config.browserKey) return void res.status(409).json({ error: 'A key is already configured.' });
  if (!local) return void res.status(403).json({ error: 'Setup is only allowed from localhost.' });
  const key = String(req.body?.key ?? '').trim();
  if (!/^AIza[0-9A-Za-z_-]{30,}$/.test(key)) return void res.status(400).json({ error: 'That does not look like a Google API key (starts with AIza).' });
  const envPath = path.resolve('.env');
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  fs.writeFileSync(envPath, `${existing.replace(/^GOOGLE_MAPS_API_KEY=.*$/m, '').trim()}\nGOOGLE_MAPS_API_KEY=${key}\n`.trimStart());
  config.serverKey = key;
  config.browserKey = key;
  config.sharedKey = true;
  res.json({ ok: true });
});

api.get('/usage', (_req, res) => res.json(store.usage()));

api.get('/properties', (_req, res) => {
  store.purgeExpired();
  res.json({ properties: store.list() });
});

api.get('/properties/:id', (req, res) => {
  const p = store.get(req.params.id);
  if (!p) return void res.status(404).json({ error: 'Property not found' });
  res.json({ property: p });
});

api.delete('/properties/:id', (req, res) => {
  res.json({ deleted: store.remove(req.params.id) });
});

/** Run the Google pipeline for an address or placeId. */
api.post('/property/measure', async (req: Request, res: Response) => {
  const address = String(req.body?.address ?? '').trim().slice(0, 300);
  const placeIdIn = String(req.body?.placeId ?? '').trim().slice(0, 300) || undefined;
  if (!address && !placeIdIn) return void res.status(400).json({ error: 'Enter an address.' });
  if (!config.serverKey)
    return void res.status(500).json({ error: 'Server API key is not configured. Set GOOGLE_MAPS_SERVER_KEY in .env and restart.' });

  try {
    const diagnostics: DiagnosticStep[] = [];
    let validation: Awaited<ReturnType<typeof validateAddress>> | null = null;

    // 1. Address Validation (text input only; optional – failure does not stop the pipeline)
    if (address && !placeIdIn && config.useAddressValidation) {
      if (store.tryUse('addressValidation')) {
        validation = await validateAddress(address);
        diagnostics.push(validation.step);
      } else {
        diagnostics.push({ at: nowIso(), service: 'USAGE_GUARD', ok: false, message: 'Daily Address Validation limit reached – skipped.' });
      }
    }

    // 2. Geocoding (authoritative coordinates + Place ID)
    if (!store.tryUse('geocode')) {
      return void res.status(429).json({ error: `Daily Geocoding limit (${config.dailyLimits.geocode}) reached.`, diagnostics });
    }
    const geo = await geocode(
      placeIdIn ? { placeId: placeIdIn } : validation?.placeId ? { placeId: validation.placeId } : { address },
    );
    diagnostics.push(geo.step);
    if (!geo.result) {
      return void res.status(422).json({ error: `Could not locate this property: ${geo.step.message}`, diagnostics });
    }

    // Reuse an existing record for the same Place ID (saves Google usage).
    const existing = store.findByPlaceId(geo.result.placeId) ?? store.findByAddress(geo.result.formattedAddress);
    if (existing && existing.solar && !req.body?.forceRefresh) {
      diagnostics.push({ at: nowIso(), service: 'CACHE', ok: true, message: 'Property already in pipeline with Solar data cached (<30 days) – Solar API not called again.' });
      existing.coordinates = coords(geo.result.location);
      existing.diagnostics = [...diagnostics];
      existing.updatedAt = nowIso();
      store.upsert(existing);
      return void res.json({ property: existing, reused: true });
    }

    // 3. Solar API buildingInsights
    const solar = await solarBuildingInsights(geo.result.location, () => store.tryUse('solar'));
    diagnostics.push(...solar.steps);

    const t = nowIso();
    const rec: PropertyRecord = existing
      ? { ...existing }
      : {
          id: id('prop'),
          inputAddress: address || geo.result.formattedAddress,
          formattedAddress: geo.result.formattedAddress,
          branch: str(req.body?.branch, 60).trim(),
          placeId: geo.result.placeId,
          coordinates: null,
          addressValidation: null,
          solar: null,
          solarStatus: { state: 'NOT_REQUESTED', message: '' },
          takeoff: emptyTakeoff(),
          status: 'NEW',
          diagnostics: [],
          createdAt: t,
          updatedAt: t,
        };
    rec.formattedAddress = geo.result.formattedAddress;
    rec.placeId = geo.result.placeId;
    rec.coordinates = coords(geo.result.location);
    rec.addressValidation = validation?.summary ?? rec.addressValidation;
    rec.solar = solar.insights;
    rec.solarStatus = solar.status;
    rec.diagnostics = diagnostics;
    rec.status = rec.takeoff.facets.length ? 'MEASURING' : 'NEW';
    rec.updatedAt = t;
    store.upsert(rec);
    res.status(existing ? 200 : 201).json({ property: rec });
  } catch (e) {
    const msg = redact((e as Error).message);
    console.error('[measure] failed:', msg);
    res.status(502).json({ error: `Lookup failed: ${msg}` });
  }
});

function coords(l: LatLng): PropertyRecord['coordinates'] {
  const c = new Date();
  return { ...l, cachedAt: c.toISOString(), expiresAt: new Date(c.getTime() + THIRTY_DAYS).toISOString() };
}

// ---------------------------------------------------------------- takeoff save

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const okLL = (p: any): p is LatLng => p && isNum(p.lat) && isNum(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
const cleanPath = (a: any): LatLng[] => (Array.isArray(a) ? a.filter(okLL).map((p) => ({ lat: p.lat, lng: p.lng })).slice(0, 500) : []);
const str = (s: any, n = 200) => String(s ?? '').slice(0, n);

/** Validate a client-submitted takeoff. Anything malformed is dropped, never invented. */
export function sanitizeTakeoff(b: any): Takeoff {
  return {
    facets: (Array.isArray(b?.facets) ? b.facets : []).slice(0, 300).map((f: any) => ({
      id: str(f.id, 40) || id('f'),
      name: str(f.name, 60) || 'Facet',
      path: cleanPath(f.path),
      pitchRise: isNum(f.pitchRise) && f.pitchRise >= 0 && f.pitchRise <= 36 ? f.pitchRise : null,
      pitchSource: f.pitchSource === 'GOOGLE_SOLAR_SEGMENT' || f.pitchSource === 'MANUAL' ? f.pitchSource : null,
      solarSegmentIndex: isNum(f.solarSegmentIndex) ? f.solarSegmentIndex : undefined,
      hasExistingSolar: !!f.hasExistingSolar,
    })),
    edges: (Array.isArray(b?.edges) ? b.edges : [])
      .slice(0, 1000)
      .filter((e: any) => EDGE_TYPES.includes(e.type))
      .map((e: any) => ({ id: str(e.id, 40) || id('e'), type: e.type, path: cleanPath(e.path) }))
      .filter((e: any) => e.path.length >= 2),
    penetrations: (Array.isArray(b?.penetrations) ? b.penetrations : [])
      .slice(0, 500)
      .filter((p: any) => PENETRATION_TYPES.includes(p.type) && okLL(p.position))
      .map((p: any) => ({ id: str(p.id, 40) || id('p'), type: p.type, position: { lat: p.position.lat, lng: p.position.lng } })),
    existingSolar: {
      present: b?.existingSolar?.present === true ? true : b?.existingSolar?.present === false ? false : null,
      panelCount: isNum(b?.existingSolar?.panelCount) ? Math.max(0, Math.round(b.existingSolar.panelCount)) : null,
      systemKw: isNum(b?.existingSolar?.systemKw) && b.existingSolar.systemKw >= 0 ? b.existingSolar.systemKw : null,
      inverterType: ['MICROINVERTER', 'STRING_OPTIMIZERS', 'STRING', 'UNKNOWN'].includes(b?.existingSolar?.inverterType) ? b.existingSolar.inverterType : null,
      installYear: isNum(b?.existingSolar?.installYear) && b.existingSolar.installYear >= 1980 && b.existingSolar.installYear <= 2100 ? Math.round(b.existingSolar.installYear) : null,
      reroofCondition: ['GOOD', 'REPAIR_REQUIRED', 'DETACH_RESET', 'DECOMMISSION'].includes(b?.existingSolar?.reroofCondition) ? b.existingSolar.reroofCondition : null,
      notes: str(b?.existingSolar?.notes, 1000),
    },
    notes: str(b?.notes, 4000),
    verified: null, // any edit clears verification
    updatedAt: nowIso(),
  };
}

api.put('/properties/:id/takeoff', (req, res) => {
  const p = store.get(req.params.id);
  if (!p) return void res.status(404).json({ error: 'Property not found' });
  p.takeoff = sanitizeTakeoff(req.body);
  p.status = p.takeoff.facets.length ? 'MEASURED' : 'NEW';
  p.updatedAt = nowIso();
  store.upsert(p);
  res.json({ property: p });
});

api.patch('/properties/:id', (req, res) => {
  const p = store.get(req.params.id);
  if (!p) return void res.status(404).json({ error: 'Property not found' });
  if (req.body?.branch !== undefined) p.branch = str(req.body.branch, 60).trim();
  p.updatedAt = nowIso();
  store.upsert(p);
  res.json({ property: p });
});

api.post('/properties/:id/verify', (req, res) => {
  const p = store.get(req.params.id);
  if (!p) return void res.status(404).json({ error: 'Property not found' });
  const checks = runChecks(p);
  if (!canVerify(checks)) {
    return void res.status(409).json({ error: 'Required checks have not passed.', checks });
  }
  p.takeoff.verified = { at: nowIso(), checksPassed: checks.filter((c) => c.passed).map((c) => c.id) };
  p.status = 'VERIFIED';
  p.updatedAt = nowIso();
  store.upsert(p);
  res.json({ property: p, checks });
});

api.use((req, res) => res.status(404).json({ error: `No API route ${req.method} ${req.path}` }));

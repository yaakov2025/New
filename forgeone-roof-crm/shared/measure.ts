// Pure measurement math. No Google SDK dependency so it runs on the server, in
// tests, and can be ported 1:1 to Swift/Kotlin.
import type { Edge, EdgeType, Facet, LatLng, PropertyRecord, SolarSegment, Takeoff } from './types.ts';
import { EDGE_TYPES } from './types.ts';

export const M_TO_FT = 3.280839895;
export const M2_TO_FT2 = M_TO_FT * M_TO_FT;

const rad = (d: number) => (d * Math.PI) / 180;

// WGS84 ellipsoid
const WGS84_A = 6378137;
const WGS84_E2 = 0.00669437999014;

/**
 * Meters per degree of latitude / longitude at a given latitude on the WGS84
 * ellipsoid. Using the local radii of curvature keeps roof-scale lengths and
 * areas within ~0.01% (a single spherical radius is off by up to ~0.3%).
 */
export function metersPerDegree(lat: number): { lat: number; lng: number } {
  const s2 = Math.sin(rad(lat)) ** 2;
  const w = 1 - WGS84_E2 * s2;
  const N = WGS84_A / Math.sqrt(w); // prime vertical radius
  const M = (WGS84_A * (1 - WGS84_E2)) / w ** 1.5; // meridional radius
  return { lat: (Math.PI / 180) * M, lng: (Math.PI / 180) * N * Math.cos(rad(lat)) };
}

/** Distance in meters. Local ellipsoidal projection – intended for distances under ~10 km. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const k = metersPerDegree((a.lat + b.lat) / 2);
  return Math.hypot((b.lat - a.lat) * k.lat, (b.lng - a.lng) * k.lng);
}

export function polylineLengthFt(path: LatLng[]): number {
  let m = 0;
  for (let i = 1; i < path.length; i++) m += distanceMeters(path[i - 1], path[i]);
  return m * M_TO_FT;
}

/** Project to local planar meters around an origin on the WGS84 ellipsoid. */
function toLocal(p: LatLng, origin: LatLng): { x: number; y: number } {
  const k = metersPerDegree(origin.lat);
  return { x: (p.lng - origin.lng) * k.lng, y: (p.lat - origin.lat) * k.lat };
}

/** Plan-view (horizontal) area of a polygon ring, in square feet. */
export function planAreaFt2(path: LatLng[]): number {
  if (path.length < 3) return 0;
  const o = path[0];
  const pts = path.map((p) => toLocal(p, o));
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return (Math.abs(s) / 2) * M2_TO_FT2;
}

export function centroid(path: LatLng[]): LatLng {
  const n = path.length || 1;
  return {
    lat: path.reduce((s, p) => s + p.lat, 0) / n,
    lng: path.reduce((s, p) => s + p.lng, 0) / n,
  };
}

/** Slope multiplier: sloped surface area = plan area × factor. */
export function pitchFactor(rise: number): number {
  return Math.sqrt(1 + (rise / 12) ** 2);
}

export function degreesToRise(deg: number): number {
  return 12 * Math.tan(rad(deg));
}

export function riseToDegrees(rise: number): number {
  return (Math.atan(rise / 12) * 180) / Math.PI;
}

export function formatPitch(rise: number | null): string {
  if (rise === null || !Number.isFinite(rise)) return '—';
  const r = Math.round(rise * 2) / 2;
  return `${Number.isInteger(r) ? r : r.toFixed(1)}/12`;
}

export function compass(deg: number | null): string {
  if (deg === null) return '—';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

export function pointInPolygon(p: LatLng, ring: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.lat > p.lat !== b.lat > p.lat && p.lng < ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng) {
      inside = !inside;
    }
  }
  return inside;
}

function segmentsIntersect(p1: LatLng, p2: LatLng, p3: LatLng, p4: LatLng): boolean {
  const d = (a: LatLng, b: LatLng, c: LatLng) => (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

export function isSelfIntersecting(ring: LatLng[]): boolean {
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
      if (segmentsIntersect(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n])) return true;
    }
  }
  return false;
}

/**
 * Find the Google Solar segment whose bounding box contains the facet centroid.
 * If several boxes overlap, pick the one whose center is nearest.
 */
export function matchSolarSegment(facet: Pick<Facet, 'path'>, segments: SolarSegment[]): SolarSegment | null {
  if (facet.path.length < 3) return null;
  const c = centroid(facet.path);
  const candidates = segments.filter(
    (s) =>
      s.boundingBox &&
      s.pitchDegrees !== null &&
      c.lat >= s.boundingBox.sw.lat &&
      c.lat <= s.boundingBox.ne.lat &&
      c.lng >= s.boundingBox.sw.lng &&
      c.lng <= s.boundingBox.ne.lng,
  );
  if (!candidates.length) return null;
  return candidates.sort(
    (a, b) => distanceMeters(c, a.center ?? c) - distanceMeters(c, b.center ?? c),
  )[0];
}

export interface FacetMeasurement {
  id: string;
  planAreaFt2: number;
  /** null when pitch is unknown – we do not guess. */
  roofAreaFt2: number | null;
  squares: number | null;
}

export function measureFacet(f: Facet): FacetMeasurement {
  const plan = planAreaFt2(f.path);
  const roof = f.pitchRise === null ? null : plan * pitchFactor(f.pitchRise);
  return { id: f.id, planAreaFt2: plan, roofAreaFt2: roof, squares: roof === null ? null : roof / 100 };
}

export interface TakeoffTotals {
  facetCount: number;
  facetsMissingPitch: number;
  planAreaFt2: number;
  /** Sum over facets that have a pitch. null if no facet has a pitch. */
  roofAreaFt2: number | null;
  squares: number | null;
  /** Area-weighted predominant pitch (rise/12) over facets with pitch. */
  predominantPitchRise: number | null;
  edgeFt: Record<EdgeType, number>;
  edgeCounts: Record<EdgeType, number>;
  penetrationCounts: Record<string, number>;
  facets: FacetMeasurement[];
}

export function computeTotals(t: Takeoff): TakeoffTotals {
  const facets = t.facets.map(measureFacet);
  const withPitch = t.facets.filter((f) => f.pitchRise !== null);
  const roofAreaFt2 = withPitch.length ? facets.reduce((s, m) => s + (m.roofAreaFt2 ?? 0), 0) : null;

  // Predominant pitch = pitch covering the largest roof area.
  let predominantPitchRise: number | null = null;
  if (withPitch.length) {
    const byPitch = new Map<number, number>();
    t.facets.forEach((f, i) => {
      if (f.pitchRise === null) return;
      const key = Math.round(f.pitchRise * 2) / 2;
      byPitch.set(key, (byPitch.get(key) ?? 0) + (facets[i].roofAreaFt2 ?? 0));
    });
    predominantPitchRise = [...byPitch.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  const edgeFt = Object.fromEntries(EDGE_TYPES.map((k) => [k, 0])) as Record<EdgeType, number>;
  const edgeCounts = Object.fromEntries(EDGE_TYPES.map((k) => [k, 0])) as Record<EdgeType, number>;
  for (const e of t.edges) {
    edgeFt[e.type] += polylineLengthFt(e.path);
    edgeCounts[e.type] += 1;
  }
  const penetrationCounts: Record<string, number> = {};
  for (const p of t.penetrations) penetrationCounts[p.type] = (penetrationCounts[p.type] ?? 0) + 1;

  return {
    facetCount: t.facets.length,
    facetsMissingPitch: t.facets.length - withPitch.length,
    planAreaFt2: facets.reduce((s, m) => s + m.planAreaFt2, 0),
    roofAreaFt2,
    squares: roofAreaFt2 === null ? null : roofAreaFt2 / 100,
    predominantPitchRise,
    edgeFt,
    edgeCounts,
    penetrationCounts,
    facets,
  };
}

export function edgeLengthFt(e: Edge): number {
  return polylineLengthFt(e.path);
}

export interface VerificationCheck {
  id: string;
  label: string;
  passed: boolean;
  /** Warnings don't block verification; failures do. */
  severity: 'required' | 'warning';
  detail: string;
}

/**
 * Defined checks a takeoff must pass before it can be labelled verified.
 * "Verified" means: complete and internally consistent, and cross-checked
 * against Google's own roof area when Google data exists.
 */
export function runChecks(p: Pick<PropertyRecord, 'takeoff' | 'solar'>): VerificationCheck[] {
  const t = p.takeoff;
  const totals = computeTotals(t);
  const checks: VerificationCheck[] = [];

  checks.push({
    id: 'has-facets',
    label: 'At least one roof facet traced',
    passed: totals.facetCount > 0,
    severity: 'required',
    detail: `${totals.facetCount} facet(s)`,
  });
  checks.push({
    id: 'pitch-set',
    label: 'Every facet has a pitch',
    passed: totals.facetCount > 0 && totals.facetsMissingPitch === 0,
    severity: 'required',
    detail: totals.facetsMissingPitch ? `${totals.facetsMissingPitch} facet(s) missing pitch` : 'All set',
  });
  const bad = t.facets.filter((f) => f.path.length < 3 || isSelfIntersecting(f.path));
  checks.push({
    id: 'valid-polygons',
    label: 'No self-intersecting / degenerate facets',
    passed: bad.length === 0,
    severity: 'required',
    detail: bad.length ? `Fix: ${bad.map((f) => f.name).join(', ')}` : 'OK',
  });
  checks.push({
    id: 'eaves',
    label: 'Eaves traced',
    passed: totals.edgeFt.EAVE > 0,
    severity: 'required',
    detail: `${totals.edgeFt.EAVE.toFixed(0)} ft`,
  });
  checks.push({
    id: 'ridge-or-hip',
    label: 'Ridges or hips traced (unless flat/shed roof)',
    passed: totals.edgeFt.RIDGE + totals.edgeFt.HIP > 0 || (totals.predominantPitchRise ?? 0) < 2,
    severity: 'warning',
    detail: `${(totals.edgeFt.RIDGE + totals.edgeFt.HIP).toFixed(0)} ft`,
  });
  checks.push({
    id: 'existing-solar',
    label: 'Existing solar inspected (yes/no recorded)',
    passed: t.existingSolar.present !== null,
    severity: 'required',
    detail: t.existingSolar.present === null ? 'Not recorded' : t.existingSolar.present ? 'Present' : 'None',
  });

  const g = p.solar?.wholeRoofAreaMeters2;
  if (g && totals.roofAreaFt2) {
    const googleFt2 = g * M2_TO_FT2;
    const diff = (totals.roofAreaFt2 - googleFt2) / googleFt2;
    checks.push({
      id: 'google-crosscheck',
      label: 'Roof area within ±10% of Google Solar wholeRoofStats.areaMeters2',
      passed: Math.abs(diff) <= 0.1,
      severity: 'warning',
      detail: `Traced ${totals.roofAreaFt2.toFixed(0)} ft² vs Google ${googleFt2.toFixed(0)} ft² (${(diff * 100).toFixed(1)}%)`,
    });
  } else {
    checks.push({
      id: 'google-crosscheck',
      label: 'Cross-check against Google Solar roof area',
      passed: false,
      severity: 'warning',
      detail: 'Not possible – no Google Solar data for this building',
    });
  }
  return checks;
}

export function canVerify(checks: VerificationCheck[]): boolean {
  return checks.filter((c) => c.severity === 'required').every((c) => c.passed);
}

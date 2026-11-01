import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canVerify,
  computeTotals,
  degreesToRise,
  distanceMeters,
  formatPitch,
  isSelfIntersecting,
  metersPerDegree,
  matchSolarSegment,
  pitchFactor,
  planAreaFt2,
  polylineLengthFt,
  runChecks,
} from '../shared/measure.ts';
import { emptyTakeoff, type LatLng } from '../shared/types.ts';
import { materialLines, DEFAULT_PRICES } from '../shared/materials.ts';
import { parseBuildingInsights } from '../server/google.ts';
import { sanitizeTakeoff } from '../server/api.ts';

// A 40 ft × 30 ft rectangle near Denver built from exact meter offsets.
const O = { lat: 39.75, lng: -105.0 };
const K = metersPerDegree(O.lat);
const ftToLat = (ft: number) => ft / 3.280839895 / K.lat;
const ftToLng = (ft: number) => ft / 3.280839895 / K.lng;
const rect = (w: number, h: number): LatLng[] => [
  O,
  { lat: O.lat, lng: O.lng + ftToLng(w) },
  { lat: O.lat + ftToLat(h), lng: O.lng + ftToLng(w) },
  { lat: O.lat + ftToLat(h), lng: O.lng },
];

test('distance and length in feet', () => {
  const p = rect(40, 30);
  assert.ok(Math.abs(polylineLengthFt([p[0], p[1]]) - 40) < 0.05);
  assert.ok(Math.abs(polylineLengthFt([p[1], p[2]]) - 30) < 0.05);
  assert.ok(Math.abs(distanceMeters(p[0], p[2]) * 3.280839895 - 50) < 0.05);
});

test('plan area of a 40×30 rectangle is 1200 ft²', () => {
  assert.ok(Math.abs(planAreaFt2(rect(40, 30)) - 1200) < 1);
});

test('WGS84 scale matches known values', () => {
  // Reference: 1° latitude = 111,132.95 m and 1° longitude = 78,846.8 m at 45°N (WGS84)
  const k = metersPerDegree(45);
  assert.ok(Math.abs(k.lat - 111132.95) < 2, String(k.lat));
  assert.ok(Math.abs(k.lng - 78846.8) < 2, String(k.lng));
});

test('pitch factor and conversions', () => {
  assert.ok(Math.abs(pitchFactor(6) - 1.118034) < 1e-5);
  assert.ok(Math.abs(pitchFactor(12) - Math.SQRT2) < 1e-9);
  assert.ok(Math.abs(degreesToRise(26.565) - 6) < 0.01);
  assert.equal(formatPitch(5.96), '6/12');
  assert.equal(formatPitch(4.5), '4.5/12');
  assert.equal(formatPitch(null), '—');
});

test('totals: unknown pitch is never guessed', () => {
  const t = emptyTakeoff();
  t.facets.push({ id: 'a', name: 'A', path: rect(40, 30), pitchRise: null, pitchSource: null, hasExistingSolar: false });
  let tot = computeTotals(t);
  assert.equal(tot.roofAreaFt2, null);
  assert.equal(tot.squares, null);
  t.facets[0].pitchRise = 6;
  tot = computeTotals(t);
  assert.ok(Math.abs(tot.roofAreaFt2! - 1200 * 1.118034) < 2);
  assert.ok(Math.abs(tot.squares! - 13.416) < 0.03);
  assert.equal(tot.predominantPitchRise, 6);
});

test('edge totals by type', () => {
  const t = emptyTakeoff();
  const p = rect(40, 30);
  t.edges.push({ id: '1', type: 'EAVE', path: [p[0], p[1]] }, { id: '2', type: 'EAVE', path: [p[2], p[3]] }, { id: '3', type: 'RAKE', path: [p[1], p[2]] });
  const tot = computeTotals(t);
  assert.ok(Math.abs(tot.edgeFt.EAVE - 80) < 0.1);
  assert.ok(Math.abs(tot.edgeFt.RAKE - 30) < 0.1);
  assert.equal(tot.edgeFt.RIDGE, 0);
});

test('self intersection detection', () => {
  const p = rect(40, 30);
  assert.equal(isSelfIntersecting(p), false);
  assert.equal(isSelfIntersecting([p[0], p[2], p[1], p[3]]), true);
});

test('verification requires facets, pitch, eaves and existing-solar answer', () => {
  const t = emptyTakeoff();
  assert.equal(canVerify(runChecks({ takeoff: t, solar: null })), false);
  const p = rect(40, 30);
  t.facets.push({ id: 'a', name: 'A', path: p, pitchRise: 6, pitchSource: 'MANUAL', hasExistingSolar: false });
  t.edges.push({ id: 'e', type: 'EAVE', path: [p[0], p[1]] });
  assert.equal(canVerify(runChecks({ takeoff: t, solar: null })), false); // existing solar unknown
  t.existingSolar.present = false;
  assert.equal(canVerify(runChecks({ takeoff: t, solar: null })), true);
});

const SAMPLE = {
  name: 'buildings/ChIJabc',
  center: { latitude: 39.75001, longitude: -105.00001 },
  imageryDate: { year: 2024, month: 6, day: 3 },
  imageryQuality: 'HIGH',
  solarPotential: {
    wholeRoofStats: { areaMeters2: 150.5, groundAreaMeters2: 133.2 },
    maxArrayPanelsCount: 40,
    roofSegmentStats: [
      {
        pitchDegrees: 26.57,
        azimuthDegrees: 181,
        stats: { areaMeters2: 75.1, groundAreaMeters2: 67.2 },
        center: { latitude: 39.75004, longitude: -105.0 },
        boundingBox: { sw: { latitude: 39.74999, longitude: -105.0001 }, ne: { latitude: 39.7501, longitude: -104.9999 } },
        planeHeightAtCenterMeters: 5.2,
      },
      { azimuthDegrees: 10 },
    ],
  },
};

test('parseBuildingInsights copies Google fields and keeps missing ones null', () => {
  const s = parseBuildingInsights(SAMPLE, O);
  assert.equal(s.imageryDate, '2024-06-03');
  assert.equal(s.wholeRoofAreaMeters2, 150.5);
  assert.equal(s.segments.length, 2);
  assert.equal(s.segments[0].pitchDegrees, 26.57);
  assert.equal(s.segments[1].pitchDegrees, null);
  assert.equal(s.segments[1].areaMeters2, null);
  assert.equal(s.segments[1].boundingBox, null);
  assert.ok(s.distanceFromGeocodeMeters! < 2);
  assert.ok(Date.parse(s.expiresAt) - Date.parse(s.fetchedAt) === 30 * 24 * 3600 * 1000);
});

test('matchSolarSegment picks the bounding box containing the facet centroid', () => {
  const s = parseBuildingInsights(SAMPLE, O);
  const f = { path: [{ lat: 39.75, lng: -105.00005 }, { lat: 39.75, lng: -104.99995 }, { lat: 39.75008, lng: -104.99995 }, { lat: 39.75008, lng: -105.00005 }] };
  assert.equal(matchSolarSegment(f, s.segments)?.index, 0);
  assert.equal(matchSolarSegment({ path: rect(400, 400).map((p) => ({ lat: p.lat + 1, lng: p.lng })) }, s.segments), null);
});

test('materials report null when roof area is unknown', () => {
  const t = emptyTakeoff();
  t.facets.push({ id: 'a', name: 'A', path: rect(40, 30), pitchRise: null, pitchSource: null, hasExistingSolar: false });
  const lines = materialLines(computeTotals(t), { system: 'ASPHALT_SHINGLE', wastePct: 10, prices: DEFAULT_PRICES });
  assert.equal(lines.find((l) => l.key === 'shingles')!.quantity, null);
  t.facets[0].pitchRise = 6;
  const l2 = materialLines(computeTotals(t), { system: 'ASPHALT_SHINGLE', wastePct: 10, prices: DEFAULT_PRICES });
  assert.equal(l2.find((l) => l.key === 'shingles')!.quantity, Math.ceil(13.416 * 1.1 * 3)); // 45 bundles
});

test('sanitizeTakeoff drops malformed input and clears verification', () => {
  const t = sanitizeTakeoff({
    facets: [{ id: 'x', name: 'A', path: [{ lat: 1, lng: 2 }, { lat: 'bad' }], pitchRise: 99 }],
    edges: [{ type: 'NOPE', path: [] }, { type: 'RIDGE', path: [{ lat: 1, lng: 1 }, { lat: 1, lng: 1.0001 }] }],
    verified: { at: 'x', checksPassed: [] },
  });
  assert.equal(t.facets[0].path.length, 1);
  assert.equal(t.facets[0].pitchRise, null);
  assert.equal(t.edges.length, 1);
  assert.equal(t.verified, null);
  assert.equal(t.existingSolar.present, null);
});

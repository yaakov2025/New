import type { PropertyRecord, Takeoff } from '../shared/types.ts';
import { M2_TO_FT2, computeTotals, edgeLengthFt, formatPitch, runChecks } from '../shared/measure.ts';
import { materialLines, type MaterialSystem } from '../shared/materials.ts';
import { EDGE_STYLE } from './editor.ts';

const q = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildCsv(p: PropertyRecord, t: Takeoff, mat?: { system: MaterialSystem; waste: number; prices: Record<string, number> }): string {
  const tot = computeTotals(t);
  const rows: unknown[][] = [];
  const NA = 'Not available';
  rows.push(['ForgeOne roof takeoff']);
  rows.push(['Field', 'Value', 'Source']);
  rows.push(['Address', p.formattedAddress, 'Geocoding formatted_address']);
  rows.push(['Google Place ID', p.placeId, 'Geocoding place_id']);
  rows.push(['Branch', p.branch || '', 'CRM']);
  rows.push(['Verified', t.verified ? t.verified.at : 'No', '']);
  rows.push(['Roof area (ft²)', tot.roofAreaFt2?.toFixed(0) ?? NA, 'Traced facets']);
  rows.push(['Squares', tot.squares?.toFixed(2) ?? NA, 'Traced facets']);
  rows.push(['Plan area (ft²)', tot.facetCount ? tot.planAreaFt2.toFixed(0) : NA, 'Traced facets']);
  rows.push(['Predominant pitch', tot.predominantPitchRise === null ? NA : formatPitch(tot.predominantPitchRise), 'Traced facets']);
  for (const [k, v] of Object.entries(tot.edgeFt)) rows.push([`${EDGE_STYLE[k as keyof typeof EDGE_STYLE].label} (ft)`, tot.edgeCounts[k as keyof typeof tot.edgeCounts] ? v.toFixed(1) : NA, 'Traced lines']);
  for (const [k, v] of Object.entries(tot.penetrationCounts)) rows.push([`Penetration: ${k}`, v, 'Marked on map']);
  const es = t.existingSolar;
  rows.push(['Existing solar', es.present === null ? 'Unknown' : es.present ? 'Yes' : 'No', 'Inspector']);
  if (es.present) {
    rows.push(['Solar panel count', es.panelCount ?? NA, 'Inspector']);
    rows.push(['Solar system size (kW)', es.systemKw ?? NA, 'Inspector']);
    rows.push(['Inverter type', es.inverterType ?? NA, 'Inspector']);
    rows.push(['Solar install year', es.installYear ?? NA, 'Inspector']);
    rows.push(['Reroof condition', es.reroofCondition ?? NA, 'Inspector']);
    rows.push(['Facets with panels', t.facets.filter((f) => f.hasExistingSolar).map((f) => f.name).join(' ') || NA, 'Inspector']);
    if (es.notes) rows.push(['Solar notes', es.notes, 'Inspector']);
  }
  rows.push(['Google whole roof area (ft²)', p.solar?.wholeRoofAreaMeters2 != null ? (p.solar.wholeRoofAreaMeters2 * M2_TO_FT2).toFixed(0) : NA, 'Solar wholeRoofStats.areaMeters2']);
  rows.push(['Google imagery', p.solar ? `${p.solar.imageryQuality} ${p.solar.imageryDate}` : NA, 'Solar imageryQuality/imageryDate']);
  rows.push([]);
  rows.push(['Checks']);
  for (const c of runChecks({ takeoff: t, solar: p.solar })) rows.push([c.label, c.passed ? 'PASS' : c.severity === 'required' ? 'FAIL' : 'WARN', c.detail]);
  rows.push([]);
  rows.push(['Facet', 'Pitch', 'Pitch source', 'Plan ft²', 'Roof ft²', 'Existing solar']);
  t.facets.forEach((f, i) => {
    const m = tot.facets[i];
    rows.push([f.name, formatPitch(f.pitchRise), f.pitchSource === 'GOOGLE_SOLAR_SEGMENT' ? `Google segment #${f.solarSegmentIndex}` : f.pitchSource ?? 'not set', m.planAreaFt2.toFixed(1), m.roofAreaFt2?.toFixed(1) ?? NA, f.hasExistingSolar ? 'Yes' : 'No']);
  });
  rows.push([]);
  rows.push(['Edge type', 'Length (ft)']);
  for (const e of t.edges) rows.push([EDGE_STYLE[e.type].label, edgeLengthFt(e).toFixed(1)]);
  if (mat) {
    rows.push([]);
    rows.push([`Materials (${mat.system}, ${mat.waste}% waste)`]);
    rows.push(['Item', 'Quantity', 'Unit', 'Unit cost', 'Total', 'Basis']);
    for (const l of materialLines(tot, { system: mat.system, wastePct: mat.waste, prices: mat.prices })) {
      rows.push([l.item, l.quantity ?? NA, l.unit, l.unitCost, l.quantity === null ? '' : (l.quantity * l.unitCost).toFixed(2), l.basis]);
    }
  }
  if (t.notes) rows.push([], ['Notes', t.notes]);
  return rows.map((r) => r.map(q).join(',')).join('\n');
}

export function downloadCsv(p: PropertyRecord, t: Takeoff, mat?: Parameters<typeof buildCsv>[2]) {
  const blob = new Blob([buildCsv(p, t, mat)], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `takeoff-${p.formattedAddress.replace(/[^a-z0-9]+/gi, '-').slice(0, 60)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

import { useMemo, useState } from 'react';
import { CheckCircle2, Download, Eye, EyeOff, RefreshCw, ShieldCheck, Trash2, XCircle, AlertTriangle } from 'lucide-react';
import type { EdgeType, PropertyRecord, Provenance, Takeoff } from '../../shared/types.ts';
import { EDGE_TYPES } from '../../shared/types.ts';
import {
  M2_TO_FT2,
  canVerify,
  compass,
  computeTotals,
  degreesToRise,
  edgeLengthFt,
  formatPitch,
  matchSolarSegment,
  riseToDegrees,
  runChecks,
} from '../../shared/measure.ts';
import { DEFAULT_PRICES, materialLines, type MaterialSystem } from '../../shared/materials.ts';
import { EDGE_STYLE, PENETRATION_LABEL, type LayerKey, type Selection, type Visibility } from '../editor.ts';
import { downloadCsv } from '../csv.ts';

const NA = 'Not available — requires additional analysis';

interface Props {
  property: PropertyRecord | null;
  takeoff: Takeoff | null;
  onChange: (fn: (t: Takeoff) => Takeoff) => void;
  selection: Selection;
  onSelect: (s: Selection) => void;
  visibility: Visibility;
  toggleLayer: (k: LayerKey) => void;
  onVerify: () => void;
  onRefresh: () => void;
  busy: boolean;
}

type Tab = 'summary' | 'facets' | 'edges' | 'google' | 'materials';

export function Src({ kind, field }: { kind: Provenance; field?: string }) {
  const style: Record<Provenance, string> = {
    GOOGLE_SOLAR: 'bg-sky-900/60 text-sky-200 border-sky-700',
    GOOGLE_GEOCODING: 'bg-sky-900/60 text-sky-200 border-sky-700',
    CALCULATED: 'bg-violet-900/60 text-violet-200 border-violet-700',
    MANUAL: 'bg-emerald-900/60 text-emerald-200 border-emerald-700',
    UNAVAILABLE: 'bg-slate-800 text-slate-400 border-slate-700',
  };
  const label: Record<Provenance, string> = { GOOGLE_SOLAR: 'GOOGLE', GOOGLE_GEOCODING: 'GOOGLE', CALCULATED: 'CALC', MANUAL: 'TRACED', UNAVAILABLE: 'N/A' };
  return (
    <span title={field} className={`text-[9px] font-bold tracking-wide border rounded px-1 py-px ${style[kind]}`}>
      {label[kind]}
    </span>
  );
}

function Row({ label, value, src, field, testId }: { label: string; value: string | null; src: Provenance; field?: string; testId?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-800/70 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="flex items-center gap-2 text-right">
        <span data-testid={testId} className={`text-xs ${value === null ? 'text-slate-500 italic' : 'font-mono text-slate-100'}`}>
          {value ?? NA}
        </span>
        <Src kind={value === null ? 'UNAVAILABLE' : src} field={field} />
      </span>
    </div>
  );
}

const Card = ({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) => (
  <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
    <div className="flex items-center justify-between mb-1">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</h3>
      {right}
    </div>
    {children}
  </section>
);

const n0 = (n: number) => Math.round(n).toLocaleString();
const PITCHES = Array.from({ length: 49 }, (_, i) => i / 2); // 0 … 24 in 0.5 steps

export function MeasurePanel(p: Props) {
  const [tab, setTab] = useState<Tab>('summary');
  const t = p.takeoff;
  const totals = useMemo(() => (t ? computeTotals(t) : null), [t]);
  const checks = useMemo(() => (p.property && t ? runChecks({ takeoff: t, solar: p.property.solar }) : []), [p.property, t]);

  if (!p.property || !t || !totals) {
    return <aside className="w-[400px] shrink-0 h-full bg-slate-900 border-l border-slate-800" />;
  }
  const prop = p.property;
  const solar = prop.solar;

  return (
    <aside className="w-[400px] shrink-0 h-full flex flex-col bg-slate-900 border-l border-slate-800 min-h-0">
      <div className="p-4 border-b border-slate-800">
        <p className="text-sm font-semibold leading-snug" data-testid="property-address">{prop.formattedAddress}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px]">
          {t.verified ? (
            <span className="flex items-center gap-1 text-emerald-300"><ShieldCheck size={12} /> Verified {new Date(t.verified.at).toLocaleString()}</span>
          ) : (
            <span className="text-slate-400">Not verified</span>
          )}
          <span className="text-slate-600">·</span>
          <SolarBadge property={prop} />
        </div>
      </div>
      <nav className="flex border-b border-slate-800 text-xs" role="tablist">
        {(['summary', 'facets', 'edges', 'google', 'materials'] as Tab[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`flex-1 py-2 font-semibold capitalize ${tab === k ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {k === 'google' ? 'Google' : k}
            {k === 'facets' && ` (${t.facets.length})`}
            {k === 'edges' && ` (${t.edges.length})`}
          </button>
        ))}
      </nav>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tab === 'summary' && (
          <>
            {prop.solarStatus.state !== 'OK' && (
              <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3 text-xs text-amber-200 space-y-1">
                <p className="font-semibold flex items-center gap-1"><AlertTriangle size={13} /> Google Solar data not available</p>
                <p>{prop.solarStatus.message}</p>
                {prop.solarStatus.fix && <p className="text-amber-100"><b>Fix:</b> {prop.solarStatus.fix}</p>}
                <p className="text-amber-300/80">You can still trace the roof on the satellite image. Traced values are labelled TRACED.</p>
              </div>
            )}
            <Card title="Roof area">
              <Row label="Roof area (sloped)" value={totals.roofAreaFt2 === null ? null : `${n0(totals.roofAreaFt2)} ft²`} src="MANUAL" field="Σ traced facet plan area × pitch factor" testId="roof-area" />
              <Row label="Squares" value={totals.squares === null ? null : totals.squares.toFixed(2)} src="MANUAL" field="roof area ÷ 100" testId="squares" />
              <Row label="Plan (footprint) area" value={totals.facetCount ? `${n0(totals.planAreaFt2)} ft²` : null} src="MANUAL" field="Σ traced facet plan area" />
              <Row label="Predominant pitch" value={totals.predominantPitchRise === null ? null : formatPitch(totals.predominantPitchRise)} src="MANUAL" />
              <Row label="Facets" value={totals.facetCount ? `${totals.facetCount}${totals.facetsMissingPitch ? ` (${totals.facetsMissingPitch} missing pitch)` : ''}` : null} src="MANUAL" />
              <Row
                label="Google whole-roof area"
                value={solar?.wholeRoofAreaMeters2 != null ? `${n0(solar.wholeRoofAreaMeters2 * M2_TO_FT2)} ft²` : null}
                src="GOOGLE_SOLAR"
                field="solarPotential.wholeRoofStats.areaMeters2 × 10.764"
                testId="google-area"
              />
            </Card>
            <Card title="Linear measurements">
              {EDGE_TYPES.map((k) => (
                <Row key={k} label={EDGE_STYLE[k].label} value={totals.edgeCounts[k] ? `${totals.edgeFt[k].toFixed(1)} ft` : null} src="MANUAL" testId={`len-${k}`} />
              ))}
              <p className="text-[10px] text-slate-500 pt-1">Google Solar does not return edge lines. Lengths come only from lines traced on the map.</p>
            </Card>
            <Card title="Penetrations & existing solar">
              {Object.keys(totals.penetrationCounts).length === 0 ? (
                <Row label="Penetrations" value={null} src="MANUAL" />
              ) : (
                Object.entries(totals.penetrationCounts).map(([k, v]) => <Row key={k} label={PENETRATION_LABEL[k as keyof typeof PENETRATION_LABEL]} value={String(v)} src="MANUAL" />)
              )}
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-slate-400">Existing solar panels on roof?</span>
                <div className="flex gap-1">
                  {([true, false, null] as const).map((v) => (
                    <button
                      key={String(v)}
                      onClick={() => p.onChange((x) => ({ ...x, existingSolar: { ...x.existingSolar, present: v } }))}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${t.existingSolar.present === v ? 'bg-cyan-700 border-cyan-500 text-white' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                    >
                      {v === true ? 'Yes' : v === false ? 'No' : 'Unknown'}
                    </button>
                  ))}
                </div>
              </div>
              {t.existingSolar.present && (
                <div className="flex items-center gap-2 pb-1">
                  <label className="text-xs text-slate-400">Panel count</label>
                  <input
                    type="number"
                    min={0}
                    value={t.existingSolar.panelCount ?? ''}
                    onChange={(e) => p.onChange((x) => ({ ...x, existingSolar: { ...x.existingSolar, panelCount: e.target.value === '' ? null : Number(e.target.value) } }))}
                    className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Mark facets with panels in the Facets tab.</span>
                </div>
              )}
            </Card>
            <Card title="Verification checks">
              <ul className="space-y-1" data-testid="checks">
                {checks.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-xs">
                    {c.passed ? (
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-px" />
                    ) : c.severity === 'required' ? (
                      <XCircle size={14} className="text-red-400 shrink-0 mt-px" />
                    ) : (
                      <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-px" />
                    )}
                    <span>
                      <span className={c.passed ? 'text-slate-200' : 'text-slate-300'}>{c.label}</span>
                      <span className="block text-[10px] text-slate-500">{c.detail}{!c.passed && c.severity === 'warning' ? ' (warning)' : ''}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={p.onVerify}
                disabled={!canVerify(checks) || !!t.verified}
                className="mt-3 w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-xs font-bold"
              >
                {t.verified ? 'Verified – any edit clears this' : canVerify(checks) ? 'Mark takeoff verified' : 'Complete required checks to verify'}
              </button>
            </Card>
            <Card title="Notes">
              <textarea
                value={t.notes}
                onChange={(e) => p.onChange((x) => ({ ...x, notes: e.target.value }))}
                rows={3}
                placeholder="Inspector notes…"
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs"
              />
            </Card>
            <div className="flex gap-2">
              <button onClick={() => downloadCsv(prop, t)} className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5">
                <Download size={14} /> Export CSV
              </button>
              <button
                onClick={p.onRefresh}
                disabled={p.busy}
                title="Calls Geocoding + Solar again (billable)"
                className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <RefreshCw size={14} /> Refresh Google data
              </button>
            </div>
          </>
        )}

        {tab === 'facets' && (
          <>
            <LayerToggles keys={['FACETS', 'LABELS', 'SOLAR_BOXES', 'PENETRATIONS']} {...p} />
            {t.facets.length === 0 && <Empty text="No facets yet. Choose the facet tool (F) and click each corner of a roof plane on the map." />}
            {t.facets.map((f, i) => {
              const m = totals.facets[i];
              const sel = p.selection?.kind === 'facet' && p.selection.id === f.id;
              const seg = matchSolarSegment(f, solar?.segments ?? []);
              const gRise = seg?.pitchDegrees != null ? Math.round(degreesToRise(seg.pitchDegrees) * 10) / 10 : null;
              return (
                <div
                  key={f.id}
                  onClick={() => p.onSelect({ kind: 'facet', id: f.id })}
                  data-testid="facet-row"
                  className={`rounded-lg border p-3 cursor-pointer ${sel ? 'border-yellow-400 bg-slate-800' : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'}`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      value={f.name}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => p.onChange((x) => ({ ...x, facets: x.facets.map((y) => (y.id === f.id ? { ...y, name: e.target.value } : y)) }))}
                      className="w-20 bg-transparent border-b border-slate-700 text-xs font-bold focus:outline-none focus:border-cyan-500"
                    />
                    <span className="text-[11px] font-mono text-slate-300 ml-auto">
                      {m.roofAreaFt2 === null ? <span className="text-red-300">set pitch</span> : `${n0(m.roofAreaFt2)} ft²`}
                    </span>
                    <button
                      title="Delete facet"
                      onClick={(e) => {
                        e.stopPropagation();
                        p.onChange((x) => ({ ...x, facets: x.facets.filter((y) => y.id !== f.id) }));
                      }}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]" onClick={(e) => e.stopPropagation()}>
                    <label className="flex items-center gap-1 text-slate-400">
                      Pitch
                      <select
                        aria-label={`Pitch for ${f.name}`}
                        value={f.pitchRise === null ? '' : String(Math.round(f.pitchRise * 2) / 2)}
                        onChange={(e) =>
                          p.onChange((x) => ({
                            ...x,
                            facets: x.facets.map((y) =>
                              y.id === f.id ? { ...y, pitchRise: e.target.value === '' ? null : Number(e.target.value), pitchSource: e.target.value === '' ? null : 'MANUAL', solarSegmentIndex: undefined } : y,
                            ),
                          }))
                        }
                        className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 font-mono text-slate-100"
                      >
                        <option value="">—</option>
                        {PITCHES.map((r) => (
                          <option key={r} value={r}>
                            {formatPitch(r)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="flex items-center gap-1 justify-end">
                      {f.pitchSource && <Src kind={f.pitchSource === 'GOOGLE_SOLAR_SEGMENT' ? 'CALCULATED' : 'MANUAL'} field={f.pitchSource === 'GOOGLE_SOLAR_SEGMENT' ? `roofSegmentStats[${f.solarSegmentIndex}].pitchDegrees → x/12` : 'entered by user'} />}
                      <span className="text-slate-500">{f.pitchRise !== null ? `${riseToDegrees(f.pitchRise).toFixed(1)}°` : ''}</span>
                    </span>
                    <span className="text-slate-400">Plan: <span className="font-mono text-slate-200">{n0(m.planAreaFt2)} ft²</span></span>
                    <label className="flex items-center gap-1 justify-end text-slate-400">
                      <input
                        type="checkbox"
                        checked={f.hasExistingSolar}
                        onChange={(e) => p.onChange((x) => ({ ...x, facets: x.facets.map((y) => (y.id === f.id ? { ...y, hasExistingSolar: e.target.checked } : y)) }))}
                      />
                      Existing solar
                    </label>
                  </div>
                  {seg && gRise !== null && (f.pitchSource !== 'GOOGLE_SOLAR_SEGMENT' || f.solarSegmentIndex !== seg.index) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        p.onChange((x) => ({
                          ...x,
                          facets: x.facets.map((y) => (y.id === f.id ? { ...y, pitchRise: gRise, pitchSource: 'GOOGLE_SOLAR_SEGMENT', solarSegmentIndex: seg.index } : y)),
                        }));
                      }}
                      className="mt-2 text-[11px] text-sky-300 hover:underline"
                    >
                      Use Google segment #{seg.index} pitch: {seg.pitchDegrees!.toFixed(1)}° ≈ {formatPitch(gRise)}
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}

        {tab === 'edges' && (
          <>
            <LayerToggles keys={[...EDGE_TYPES, 'LABELS']} {...p} />
            {t.edges.length === 0 && <Empty text="No edge lines yet. Choose the edge tool (E), pick a type, and click along the roof line." />}
            {EDGE_TYPES.filter((k) => totals.edgeCounts[k]).map((k) => (
              <Card key={k} title={`${EDGE_STYLE[k].label} · ${totals.edgeFt[k].toFixed(1)} ft`}>
                <ul className="space-y-1">
                  {t.edges.filter((e) => e.type === k).map((e) => {
                    const sel = p.selection?.kind === 'edge' && p.selection.id === e.id;
                    return (
                      <li
                        key={e.id}
                        onClick={() => p.onSelect({ kind: 'edge', id: e.id })}
                        className={`flex items-center gap-2 rounded px-2 py-1 cursor-pointer text-xs ${sel ? 'bg-slate-700 ring-1 ring-yellow-400' : 'hover:bg-slate-800'}`}
                      >
                        <span className="w-3 h-1 rounded" style={{ background: EDGE_STYLE[e.type].color }} />
                        <span className="font-mono">{edgeLengthFt(e).toFixed(1)} ft</span>
                        <select
                          aria-label="Edge type"
                          value={e.type}
                          onClick={(ev) => ev.stopPropagation()}
                          onChange={(ev) => p.onChange((x) => ({ ...x, edges: x.edges.map((y) => (y.id === e.id ? { ...y, type: ev.target.value as EdgeType } : y)) }))}
                          className="ml-auto bg-slate-800 border border-slate-700 rounded px-1 text-[11px]"
                        >
                          {EDGE_TYPES.map((tt) => (
                            <option key={tt} value={tt}>{EDGE_STYLE[tt].label}</option>
                          ))}
                        </select>
                        <button
                          title="Delete line"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            p.onChange((x) => ({ ...x, edges: x.edges.filter((y) => y.id !== e.id) }));
                          }}
                          className="text-slate-500 hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}
          </>
        )}

        {tab === 'google' && <GoogleTab {...p} />}
        {tab === 'materials' && <MaterialsTab totals={totals} property={prop} takeoff={t} />}
      </div>
    </aside>
  );
}

function SolarBadge({ property }: { property: PropertyRecord }) {
  const s = property.solarStatus.state;
  const text: Record<string, string> = {
    OK: 'Google Solar data',
    NO_COVERAGE: 'No Google Solar coverage',
    KEY_BLOCKED: 'Solar blocked by key restrictions',
    API_DISABLED: 'Solar API disabled',
    QUOTA: 'Solar quota reached',
    ERROR: 'Solar API error',
    NOT_REQUESTED: 'Solar not requested',
    EXPIRED: 'Solar cache expired',
  };
  return <span className={s === 'OK' ? 'text-sky-300' : 'text-amber-300'} data-testid="solar-state">{text[s]}</span>;
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-slate-500 text-center py-6 px-4">{text}</p>;
}

function LayerToggles({ keys, visibility, toggleLayer }: { keys: LayerKey[]; visibility: Visibility; toggleLayer: (k: LayerKey) => void }) {
  const name = (k: LayerKey) =>
    k in EDGE_STYLE ? EDGE_STYLE[k as EdgeType].label : ({ FACETS: 'Facets', LABELS: 'Labels', SOLAR_BOXES: 'Google segment boxes', PENETRATIONS: 'Penetrations' } as Record<string, string>)[k];
  return (
    <div className="flex flex-wrap gap-1">
      {keys.map((k) => (
        <button
          key={k}
          onClick={() => toggleLayer(k)}
          aria-pressed={visibility[k]}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] ${visibility[k] ? 'border-slate-600 text-slate-200' : 'border-slate-800 text-slate-500'}`}
        >
          {visibility[k] ? <Eye size={11} /> : <EyeOff size={11} />}
          {k in EDGE_STYLE && <span className="w-2 h-1 rounded" style={{ background: EDGE_STYLE[k as EdgeType].color }} />}
          {name(k)}
        </button>
      ))}
    </div>
  );
}

function GoogleTab(p: Props) {
  const prop = p.property!;
  const s = prop.solar;
  if (!s) {
    return (
      <div className="space-y-3">
        <Card title="Google Solar API">
          <p className="text-xs text-slate-300">{prop.solarStatus.message || NA}</p>
          {prop.solarStatus.fix && <p className="text-xs text-amber-200 mt-2"><b>Fix:</b> {prop.solarStatus.fix}</p>}
        </Card>
        <Card title="Location">
          <Row label="Place ID" value={prop.placeId} src="GOOGLE_GEOCODING" field="Geocoding results[0].place_id" />
          <Row label="Coordinates" value={prop.coordinates ? `${prop.coordinates.lat.toFixed(6)}, ${prop.coordinates.lng.toFixed(6)}` : null} src="GOOGLE_GEOCODING" field="Geocoding results[0].geometry.location" />
        </Card>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <Card title="Building (buildingInsights:findClosest)">
        <Row label="Building" value={s.buildingName} src="GOOGLE_SOLAR" field="name" />
        <Row label="Imagery" value={s.imageryQuality ? `${s.imageryQuality} · ${s.imageryDate ?? '?'}` : null} src="GOOGLE_SOLAR" field="imageryQuality, imageryDate" />
        <Row label="Distance from address point" value={s.distanceFromGeocodeMeters != null ? `${s.distanceFromGeocodeMeters} m` : null} src="CALCULATED" field="center vs geocode location" />
        <Row label="Whole roof area" value={s.wholeRoofAreaMeters2 != null ? `${n0(s.wholeRoofAreaMeters2 * M2_TO_FT2)} ft² (${s.wholeRoofAreaMeters2.toFixed(1)} m²)` : null} src="GOOGLE_SOLAR" field="solarPotential.wholeRoofStats.areaMeters2" />
        <Row label="Whole roof ground area" value={s.wholeRoofGroundAreaMeters2 != null ? `${n0(s.wholeRoofGroundAreaMeters2 * M2_TO_FT2)} ft²` : null} src="GOOGLE_SOLAR" field="solarPotential.wholeRoofStats.groundAreaMeters2" />
        <Row label="Max solar panels" value={s.maxArrayPanelsCount != null ? String(s.maxArrayPanelsCount) : null} src="GOOGLE_SOLAR" field="solarPotential.maxArrayPanelsCount" />
        <Row label="Max sunshine" value={s.maxSunshineHoursPerYear != null ? `${n0(s.maxSunshineHoursPerYear)} h/yr` : null} src="GOOGLE_SOLAR" field="solarPotential.maxSunshineHoursPerYear" />
        <p className="text-[10px] text-slate-500 pt-1">Cached until {new Date(s.expiresAt).toLocaleDateString()} (30-day limit), then deleted automatically.</p>
      </Card>
      <Card title={`Roof segments (roofSegmentStats) · ${s.segments.length}`}>
        <p className="text-[10px] text-slate-500 mb-2">
          Google gives each segment's pitch, azimuth, area and a rectangular bounding box. The box is NOT the plane outline, so these areas are shown for reference and to
          cross-check your traced facets.
        </p>
        <table className="w-full text-[11px] font-mono">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left font-normal">#</th>
              <th className="text-right font-normal" title="pitchDegrees">Pitch°</th>
              <th className="text-right font-normal">≈x/12</th>
              <th className="text-right font-normal" title="azimuthDegrees">Azimuth</th>
              <th className="text-right font-normal" title="stats.areaMeters2">Area ft²</th>
            </tr>
          </thead>
          <tbody>
            {s.segments.map((g) => {
              const sel = p.selection?.kind === 'solarSegment' && p.selection.index === g.index;
              return (
                <tr key={g.index} onClick={() => p.onSelect({ kind: 'solarSegment', index: g.index })} className={`cursor-pointer ${sel ? 'bg-slate-700' : 'hover:bg-slate-800'}`}>
                  <td>{g.index}</td>
                  <td className="text-right">{g.pitchDegrees?.toFixed(1) ?? '—'}</td>
                  <td className="text-right text-violet-300">{g.pitchDegrees != null ? formatPitch(degreesToRise(g.pitchDegrees)) : '—'}</td>
                  <td className="text-right">{g.azimuthDegrees != null ? `${g.azimuthDegrees.toFixed(0)}° ${compass(g.azimuthDegrees)}` : '—'}</td>
                  <td className="text-right">{g.areaMeters2 != null ? n0(g.areaMeters2 * M2_TO_FT2) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-2 flex gap-2 text-[10px]"><Src kind="GOOGLE_SOLAR" /> direct field <Src kind="CALCULATED" /> unit conversion</div>
      </Card>
    </div>
  );
}

function MaterialsTab({ totals, property, takeoff }: { totals: ReturnType<typeof computeTotals>; property: PropertyRecord; takeoff: Takeoff }) {
  const [system, setSystem] = useState<MaterialSystem>('ASPHALT_SHINGLE');
  const [waste, setWaste] = useState(10);
  const [prices, setPrices] = useState<Record<string, number>>({ ...DEFAULT_PRICES });
  const lines = materialLines(totals, { system, wastePct: waste, prices });
  const total = lines.reduce((s, l) => s + (l.quantity ?? 0) * l.unitCost, 0);
  const missing = lines.some((l) => l.quantity === null);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select value={system} onChange={(e) => setSystem(e.target.value as MaterialSystem)} className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs">
          <option value="ASPHALT_SHINGLE">Architectural asphalt shingle</option>
          <option value="STANDING_SEAM_METAL">Standing seam metal</option>
        </select>
        <select value={waste} onChange={(e) => setWaste(Number(e.target.value))} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs" aria-label="Waste factor">
          {[5, 7, 10, 12, 15, 20].map((w) => (
            <option key={w} value={w}>{w}% waste</option>
          ))}
        </select>
      </div>
      {missing && <p className="text-[11px] text-amber-300">Some items need roof area (trace facets and set every pitch) – shown as N/A.</p>}
      <table className="w-full text-[11px]">
        <thead className="text-slate-500">
          <tr>
            <th className="text-left font-normal">Item</th>
            <th className="text-right font-normal">Qty</th>
            <th className="text-right font-normal">Unit $</th>
            <th className="text-right font-normal">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.key} className="border-t border-slate-800 align-top">
              <td className="py-1.5 pr-2">
                {l.item}
                <span className="block text-[10px] text-slate-500">{l.basis}</span>
              </td>
              <td className="text-right font-mono whitespace-nowrap">{l.quantity === null ? 'N/A' : `${l.quantity} ${l.unit}`}</td>
              <td className="text-right">
                <input
                  type="number"
                  min={0}
                  value={l.unitCost}
                  onChange={(e) => setPrices({ ...prices, [l.key]: Number(e.target.value) })}
                  className="w-16 bg-slate-800 border border-slate-700 rounded px-1 text-right font-mono"
                />
              </td>
              <td className="text-right font-mono">{l.quantity === null ? '—' : `$${n0(l.quantity * l.unitCost)}`}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-600">
            <td colSpan={3} className="py-2 font-bold">Material subtotal{missing ? ' (incomplete)' : ''}</td>
            <td className="text-right font-mono font-bold">${n0(total)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="text-[10px] text-slate-500">Unit prices are editable placeholders – enter your supplier pricing. Quantities come only from traced measurements.</p>
      <button onClick={() => downloadCsv(property, takeoff, { system, waste, prices })} className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5">
        <Download size={14} /> Export CSV with materials
      </button>
    </div>
  );
}

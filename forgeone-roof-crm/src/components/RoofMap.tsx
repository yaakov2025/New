import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  Crosshair,
  Hexagon,
  Locate,
  MapPin,
  MousePointer2,
  Redo2,
  Ruler,
  Spline,
  Undo2,
  X,
  Check,
} from 'lucide-react';
import type { EdgeType, Facet, LatLng, PenetrationType, PropertyRecord, Takeoff } from '../../shared/types.ts';
import { EDGE_TYPES, PENETRATION_TYPES } from '../../shared/types.ts';
import {
  centroid,
  degreesToRise,
  distanceMeters,
  formatPitch,
  matchSolarSegment,
  measureFacet,
  planAreaFt2,
  polylineLengthFt,
} from '../../shared/measure.ts';
import {
  EDGE_STYLE,
  FACET_COLOR,
  PENETRATION_LABEL,
  SELECT_COLOR,
  newId,
  type Selection,
  type Tool,
  type Visibility,
  type LayerKey,
} from '../editor.ts';

interface Props {
  property: PropertyRecord | null;
  takeoff: Takeoff | null;
  mapId: string;
  onChange: (fn: (t: Takeoff) => Takeoff) => void;
  selection: Selection;
  onSelect: (s: Selection) => void;
  tool: Tool;
  setTool: (t: Tool) => void;
  visibility: Visibility;
  toggleLayer: (k: LayerKey) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const SNAP_PX = 12;

export function propertyCenter(p: PropertyRecord | null, t: Takeoff | null): LatLng | null {
  if (p?.coordinates) return { lat: p.coordinates.lat, lng: p.coordinates.lng };
  if (p?.solar?.center) return p.solar.center;
  const pts = t?.facets.flatMap((f) => f.path) ?? [];
  return pts.length ? centroid(pts) : null;
}

export function RoofMap(props: Props) {
  const { property, takeoff, tool, setTool } = props;
  const [draft, setDraft] = useState<LatLng[]>([]);
  const [cursor, setCursor] = useState<LatLng | null>(null);
  const [mapType, setMapType] = useState<'satellite' | 'hybrid' | 'roadmap'>('satellite');
  const [legendOpen, setLegendOpen] = useState(true);
  const center = propertyCenter(property, takeoff);

  // Reset draft whenever the tool or property changes.
  useEffect(() => {
    setDraft([]);
    setCursor(null);
  }, [tool.mode, tool.edgeType, property?.id]);

  const draftLenFt = useMemo(() => {
    const pts = cursor && draft.length ? [...draft, cursor] : draft;
    return polylineLengthFt(pts);
  }, [draft, cursor]);
  const draftAreaFt2 = useMemo(() => {
    const pts = cursor ? [...draft, cursor] : draft;
    return pts.length >= 3 ? planAreaFt2(pts) : 0;
  }, [draft, cursor]);

  const finishFacet = useCallback(() => {
    if (tool.mode !== 'facet' || draft.length < 3) return;
    const path = draft;
    props.onChange((t) => {
      const seg = matchSolarSegment({ path }, property?.solar?.segments ?? []);
      const facet: Facet = {
        id: newId('f'),
        name: `F${t.facets.length + 1}`,
        path,
        pitchRise: seg?.pitchDegrees != null ? Math.round(degreesToRise(seg.pitchDegrees) * 10) / 10 : null,
        pitchSource: seg ? 'GOOGLE_SOLAR_SEGMENT' : null,
        solarSegmentIndex: seg?.index,
        hasExistingSolar: false,
      };
      setTimeout(() => props.onSelect({ kind: 'facet', id: facet.id }), 0);
      return { ...t, facets: [...t.facets, facet] };
    });
    setDraft([]);
  }, [tool.mode, draft, props, property]);

  const cancelDraft = useCallback(() => {
    setDraft([]);
    setCursor(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // composedPath()[0] reaches inside shadow DOM (e.g. the Places autocomplete input).
      const el = (e.composedPath()[0] ?? e.target) as HTMLElement;
      const typing = (x: HTMLElement | null) =>
        !!x && (['INPUT', 'TEXTAREA', 'SELECT'].includes(x.tagName) || x.isContentEditable || x.tagName.startsWith('GMP-'));
      if (typing(el) || typing(document.activeElement as HTMLElement | null)) return;
      if (e.key === 'Escape') {
        if (draft.length) cancelDraft();
        else if (tool.mode !== 'select') setTool({ ...tool, mode: 'select' });
        else props.onSelect(null);
      } else if (e.key === 'Enter') {
        finishFacet();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        if (draft.length) {
          e.preventDefault();
          setDraft((d) => d.slice(0, -1));
        } else if (props.selection && props.selection.kind !== 'solarSegment') {
          e.preventDefault();
          const s = props.selection;
          props.onChange((t) => ({
            ...t,
            facets: s.kind === 'facet' ? t.facets.filter((f) => f.id !== s.id) : t.facets,
            edges: s.kind === 'edge' ? t.edges.filter((x) => x.id !== s.id) : t.edges,
            penetrations: s.kind === 'penetration' ? t.penetrations.filter((x) => x.id !== s.id) : t.penetrations,
          }));
          props.onSelect(null);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) props.onRedo();
        else props.onUndo();
      } else if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'v') setTool({ ...tool, mode: 'select' });
        if (k === 'f') setTool({ ...tool, mode: 'facet' });
        if (k === 'e') setTool({ ...tool, mode: 'edge' });
        if (k === 'p') setTool({ ...tool, mode: 'penetration' });
        if (k === 'm') setTool({ ...tool, mode: 'measure' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft, tool, setTool, finishFacet, cancelDraft, props]);

  if (!property) {
    return (
      <div className="h-full w-full grid place-items-center bg-slate-950 text-slate-500 text-sm">
        Search for an address to start a roof measurement.
      </div>
    );
  }

  if (!center) {
    return (
      <div className="h-full w-full grid place-items-center bg-slate-950 text-slate-400 text-sm text-center px-8">
        Stored coordinates for this property expired (30-day limit) and nothing has been traced yet.
        <br />
        Use “Refresh Google data” in the right panel to look the address up again.
      </div>
    );
  }

  const modeHint: Record<Tool['mode'], string> = {
    select: 'Click a facet, line or marker to select it. Drag white handles to move corners; drag a midpoint to add a corner; right-click a corner to delete it.',
    facet: 'Click each roof-plane corner. Click the first corner (or press Enter) to close the facet. Backspace removes the last point.',
    edge: `Click to start a ${EDGE_STYLE[tool.edgeType].label.toLowerCase()} line, click again for each segment. Click the last point again or press Esc to stop.`,
    penetration: `Click on the roof to mark a ${PENETRATION_LABEL[tool.penetrationType].toLowerCase()}.`,
    measure: 'Click points to measure a distance. Nothing is saved. Esc clears.',
  };

  return (
    <div className="relative h-full w-full">
      {/* Explicit height: the map canvas collapses to 0×0 without it. */}
      <Map
        key={property.id}
        mapId={props.mapId}
        style={{ width: '100%', height: '100%' }}
        defaultCenter={center}
        defaultZoom={20}
        defaultTilt={0}
        defaultHeading={0}
        mapTypeId={mapType}
        maxZoom={22}
        gestureHandling="greedy"
        disableDoubleClickZoom
        clickableIcons={false}
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={false}
        rotateControl={false}
        draggableCursor={tool.mode === 'select' ? undefined : 'crosshair'}
      >
        <Overlays {...props} draft={draft} setDraft={setDraft} setCursor={setCursor} cursor={cursor} finishFacet={finishFacet} />
      </Map>

      {/* Toolbar */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1 rounded-lg bg-slate-900/95 border border-slate-700 p-1 shadow-xl" role="toolbar" aria-label="Drawing tools">
          <ToolBtn active={tool.mode === 'select'} onClick={() => setTool({ ...tool, mode: 'select' })} label="Select / edit (V)" icon={<MousePointer2 size={15} />} />
          <ToolBtn active={tool.mode === 'facet'} onClick={() => setTool({ ...tool, mode: 'facet' })} label="Draw facet (F)" icon={<Hexagon size={15} />} />
          <ToolBtn active={tool.mode === 'edge'} onClick={() => setTool({ ...tool, mode: 'edge' })} label="Draw edge line (E)" icon={<Spline size={15} />} />
          <ToolBtn active={tool.mode === 'penetration'} onClick={() => setTool({ ...tool, mode: 'penetration' })} label="Mark penetration (P)" icon={<MapPin size={15} />} />
          <ToolBtn active={tool.mode === 'measure'} onClick={() => setTool({ ...tool, mode: 'measure' })} label="Measure distance (M)" icon={<Ruler size={15} />} />
          <div className="w-px h-6 bg-slate-700 mx-1" />
          <ToolBtn disabled={!props.canUndo} onClick={props.onUndo} label="Undo (Ctrl+Z)" icon={<Undo2 size={15} />} />
          <ToolBtn disabled={!props.canRedo} onClick={props.onRedo} label="Redo (Ctrl+Shift+Z)" icon={<Redo2 size={15} />} />
        </div>

        {tool.mode === 'edge' && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg bg-slate-900/95 border border-slate-700 p-1 shadow-xl" role="radiogroup" aria-label="Edge type">
            {EDGE_TYPES.map((t: EdgeType) => (
              <button
                key={t}
                role="radio"
                aria-checked={tool.edgeType === t}
                onClick={() => setTool({ ...tool, edgeType: t })}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 ${tool.edgeType === t ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <span className="inline-block w-3 h-1 rounded" style={{ background: EDGE_STYLE[t].color }} />
                {EDGE_STYLE[t].label}
              </button>
            ))}
          </div>
        )}
        {tool.mode === 'penetration' && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg bg-slate-900/95 border border-slate-700 p-1 shadow-xl">
            {PENETRATION_TYPES.map((t: PenetrationType) => (
              <button
                key={t}
                onClick={() => setTool({ ...tool, penetrationType: t })}
                className={`px-2 py-1 rounded text-xs font-semibold ${tool.penetrationType === t ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                {PENETRATION_LABEL[t]}
              </button>
            ))}
          </div>
        )}

        <div className="pointer-events-auto ml-auto flex items-center gap-1 rounded-lg bg-slate-900/95 border border-slate-700 p-1 shadow-xl">
          {(['satellite', 'hybrid', 'roadmap'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMapType(m)}
              aria-pressed={mapType === m}
              className={`px-2 py-1 rounded text-xs font-semibold ${mapType === m ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              {{ satellite: 'Satellite', hybrid: 'Satellite + labels', roadmap: 'Road map' }[m]}
            </button>
          ))}
          <RecenterButton center={center} />
        </div>
      </div>

      {/* Legend – click an entry to show / hide that layer */}
      <div className="absolute bottom-24 left-3 rounded-lg bg-slate-900/95 border border-slate-700 shadow-xl text-[11px]" data-testid="legend">
        <button onClick={() => setLegendOpen(!legendOpen)} className="w-full text-left px-3 py-1.5 font-bold text-slate-300">
          Legend {legendOpen ? '▾' : '▸'}
        </button>
        {legendOpen && (
          <ul className="px-2 pb-2 space-y-0.5">
            {EDGE_TYPES.map((t) => (
              <LegendItem key={t} on={props.visibility[t]} onClick={() => props.toggleLayer(t)} swatch={<span className="inline-block w-4 h-1 rounded" style={{ background: EDGE_STYLE[t].color }} />} label={`${EDGE_STYLE[t].label}${countOf(takeoff, t)}`} />
            ))}
            <LegendItem on={props.visibility.FACETS} onClick={() => props.toggleLayer('FACETS')} swatch={<span className="inline-block w-4 h-3 rounded-sm border" style={{ background: FACET_COLOR + '55', borderColor: FACET_COLOR }} />} label="Facet" />
            <LegendItem on={props.visibility.FACETS} onClick={() => props.toggleLayer('FACETS')} swatch={<span className="inline-block w-4 h-3 rounded-sm border border-red-400 bg-red-400/40" />} label="Facet – pitch not set" />
            <LegendItem on={props.visibility.FACETS} onClick={() => props.toggleLayer('FACETS')} swatch={<span className="inline-block w-4 h-3 rounded-sm border border-yellow-300 bg-yellow-300/40" />} label="Facet – existing solar" />
            <LegendItem on={props.visibility.PENETRATIONS} onClick={() => props.toggleLayer('PENETRATIONS')} swatch={<span className="inline-block w-3 h-3 rounded-full bg-rose-500 border-2 border-white" />} label="Penetration" />
            {property.solar && (
              <LegendItem on={props.visibility.SOLAR_BOXES} onClick={() => props.toggleLayer('SOLAR_BOXES')} swatch={<span className="inline-block w-4 h-3 border border-dashed border-slate-200" />} label="Google segment box (reference)" />
            )}
            <LegendItem on={props.visibility.LABELS} onClick={() => props.toggleLayer('LABELS')} swatch={<span className="inline-block text-[9px] font-mono bg-slate-700 px-0.5 rounded">12′</span>} label="Labels" />
          </ul>
        )}
      </div>

      {/* Draft HUD */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-[90%] pointer-events-none">
        <div className="pointer-events-auto rounded-lg bg-slate-900/95 border border-slate-700 px-3 py-2 shadow-xl text-xs text-slate-300 flex items-center gap-3">
          <Crosshair size={14} className="text-cyan-400 shrink-0" />
          <span>{modeHint[tool.mode]}</span>
          {(tool.mode === 'facet' || tool.mode === 'measure' || tool.mode === 'edge') && draft.length > 0 && (
            <span className="font-mono text-cyan-300 whitespace-nowrap" data-testid="draft-readout">
              {tool.mode === 'facet' ? `${draft.length} pts · ${Math.round(draftAreaFt2).toLocaleString()} ft² plan` : `${draftLenFt.toFixed(1)} ft`}
            </span>
          )}
          {tool.mode === 'facet' && draft.length >= 3 && (
            <button onClick={finishFacet} className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1 whitespace-nowrap">
              <Check size={13} /> Finish facet
            </button>
          )}
          {draft.length > 0 && (
            <button onClick={cancelDraft} className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-semibold flex items-center gap-1">
              <X size={13} /> Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function countOf(t: Takeoff | null, type: EdgeType) {
  const es = t?.edges.filter((e) => e.type === type) ?? [];
  return es.length ? ` · ${es.reduce((sum, e) => sum + polylineLengthFt(e.path), 0).toFixed(0)}′` : '';
}

function LegendItem({ on, onClick, swatch, label }: { on: boolean; onClick: () => void; swatch: React.ReactNode; label: string }) {
  return (
    <li>
      <button onClick={onClick} aria-pressed={on} className={`w-full flex items-center gap-2 px-1 py-0.5 rounded hover:bg-slate-800 ${on ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
        <span className="w-5 flex justify-center">{swatch}</span>
        {label}
      </button>
    </li>
  );
}

function ToolBtn(p: { active?: boolean; disabled?: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      title={p.label}
      aria-label={p.label}
      aria-pressed={p.active}
      disabled={p.disabled}
      onClick={p.onClick}
      className={`h-8 w-8 grid place-items-center rounded ${p.active ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'} disabled:opacity-30 disabled:hover:bg-transparent`}
    >
      {p.icon}
    </button>
  );
}

function RecenterButton({ center }: { center: LatLng }) {
  const map = useMap();
  return (
    <button
      title="Recenter on property"
      onClick={() => {
        map?.setCenter(center);
        map?.setZoom(20);
      }}
      className="h-7 w-7 grid place-items-center rounded text-slate-300 hover:bg-slate-800"
    >
      <Locate size={15} />
    </button>
  );
}

// -------------------------------------------------------------------- overlays

interface OverlayProps extends Props {
  draft: LatLng[];
  setDraft: React.Dispatch<React.SetStateAction<LatLng[]>>;
  cursor: LatLng | null;
  setCursor: (p: LatLng | null) => void;
  finishFacet: () => void;
}

type Shape = google.maps.Polygon | google.maps.Polyline;

const toLL = (p: google.maps.LatLng): LatLng => ({ lat: p.lat(), lng: p.lng() });
const samePath = (a: LatLng[], b: LatLng[]) =>
  a.length === b.length && a.every((p, i) => Math.abs(p.lat - b[i].lat) < 1e-10 && Math.abs(p.lng - b[i].lng) < 1e-10);

function Overlays(props: OverlayProps) {
  const map = useMap();
  const markerLib = useMapsLibrary('marker');
  const latest = useRef(props);
  latest.current = props;

  const shapes = useRef(new globalThis.Map<string, { shape: Shape; listeners: google.maps.MapsEventListener[] }>());
  const markers = useRef(new globalThis.Map<string, google.maps.marker.AdvancedMarkerElement>());
  const labels = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const solarBoxes = useRef<google.maps.Polyline[]>([]);
  const draftLine = useRef<google.maps.Polyline | null>(null);
  const rubber = useRef<google.maps.Polyline | null>(null);
  const draftDots = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const suppress = useRef(false);

  // ---- snapping
  const snapTolMeters = useCallback(() => {
    if (!map) return 0.5;
    const z = map.getZoom() ?? 20;
    const lat = map.getCenter()?.lat() ?? 0;
    return (SNAP_PX * 156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
  }, [map]);

  const snap = useCallback(
    (p: LatLng, exclude?: { id: string; index: number }): LatLng => {
      const t = latest.current.takeoff;
      if (!t) return p;
      const tol = snapTolMeters();
      let best: LatLng | null = null;
      let bestD = tol;
      const consider = (q: LatLng) => {
        const d = distanceMeters(p, q);
        if (d < bestD) {
          bestD = d;
          best = q;
        }
      };
      for (const f of t.facets) f.path.forEach((q, i) => (exclude && exclude.id === f.id && exclude.index === i ? null : consider(q)));
      for (const e of t.edges) e.path.forEach((q, i) => (exclude && exclude.id === e.id && exclude.index === i ? null : consider(q)));
      latest.current.draft.forEach(consider);
      return best ?? p;
    },
    [snapTolMeters],
  );

  // ---- click on map / shapes while drawing
  const handleDrawClick = useCallback(
    (raw: LatLng) => {
      const P = latest.current;
      const { mode } = P.tool;
      const p = snap(raw);
      const tol = snapTolMeters();
      if (mode === 'penetration') {
        P.onChange((t) => ({ ...t, penetrations: [...t.penetrations, { id: newId('p'), type: P.tool.penetrationType, position: raw }] }));
        return;
      }
      if (mode === 'facet') {
        if (P.draft.length >= 3 && distanceMeters(p, P.draft[0]) <= tol) return P.finishFacet();
        if (P.draft.length && distanceMeters(p, P.draft[P.draft.length - 1]) <= tol / 3) {
          if (P.draft.length >= 3) P.finishFacet(); // double-click on last corner finishes
          return;
        }
        P.setDraft((d) => [...d, p]);
        return;
      }
      if (mode === 'edge') {
        const last = P.draft[P.draft.length - 1];
        if (last && distanceMeters(p, last) <= tol) {
          P.setDraft([]); // click same point again (or double-click) ends the chain
          return;
        }
        if (last) {
          const edge = { id: newId('e'), type: P.tool.edgeType, path: [last, p] };
          P.onChange((t) => ({ ...t, edges: [...t.edges, edge] }));
        }
        P.setDraft([p]); // chain continues from this point
        return;
      }
      if (mode === 'measure') {
        const last = P.draft[P.draft.length - 1];
        if (last && distanceMeters(p, last) <= tol / 3) return;
        P.setDraft((d) => [...d, p]);
      }
    },
    [snap, snapTolMeters],
  );

  const onShapeClick = useCallback((sel: Selection) => {
    // Shape clicks only matter for selection; drawing uses raw pointer events.
    if (latest.current.tool.mode === 'select') latest.current.onSelect(sel);
  }, []);

  // ---- map-level input
  // Google's map "click" event swallows the 2nd of two quick clicks (it waits to
  // detect a double-click), which loses corners while tracing. While drawing we
  // therefore read raw pointer events on the map container (capture phase, so
  // shapes and markers underneath cannot eat them) and convert pixels to LatLng
  // with an OverlayView projection.
  useEffect(() => {
    if (!map) return;
    if (location.search.includes('debug')) (window as any).__map = map;
    const ov = new google.maps.OverlayView();
    ov.onAdd = () => {};
    ov.draw = () => {};
    ov.onRemove = () => {};
    ov.setMap(map);
    const div = map.getDiv();
    const toLatLng = (e: PointerEvent): LatLng | null => {
      const proj = ov.getProjection();
      if (!proj) return null;
      const r = div.getBoundingClientRect();
      const ll = proj.fromContainerPixelToLatLng(new google.maps.Point(e.clientX - r.left, e.clientY - r.top));
      return ll ? toLL(ll) : null;
    };
    const isControl = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest('.gmnoprint, .gm-control-active, .gm-style-cc, button, a, [role="button"]');
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = e.button === 0 && !isControl(e.target) ? { x: e.clientX, y: e.clientY } : null;
    };
    const onUp = (e: PointerEvent) => {
      const d = down;
      down = null;
      if (!d || latest.current.tool.mode === 'select') return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return; // it was a pan
      const ll = toLatLng(e);
      if (ll) handleDrawClick(ll);
    };
    const onMove = (e: PointerEvent) => {
      const P = latest.current;
      if (P.tool.mode === 'select' || !P.draft.length) return;
      const ll = toLatLng(e);
      if (ll) P.setCursor(ll);
    };
    div.addEventListener('pointerdown', onDown, true);
    div.addEventListener('pointerup', onUp, true);
    div.addEventListener('pointermove', onMove, true);
    const l1 = map.addListener('click', () => {
      if (latest.current.tool.mode === 'select') latest.current.onSelect(null);
    });
    return () => {
      div.removeEventListener('pointerdown', onDown, true);
      div.removeEventListener('pointerup', onUp, true);
      div.removeEventListener('pointermove', onMove, true);
      l1.remove();
      ov.setMap(null);
    };
  }, [map, handleDrawClick]);

  // ---- bind path edit listeners (vertex drag / insert / delete)
  const bindPath = useCallback(
    (kind: 'facet' | 'edge', id: string, shape: Shape, holder: { listeners: google.maps.MapsEventListener[] }) => {
      holder.listeners.forEach((l) => l.remove());
      const path = shape.getPath();
      const commit = (index?: number) => {
        if (suppress.current) return;
        let pts = path.getArray().map(toLL);
        if (index !== undefined && pts[index]) {
          const s = snap(pts[index], { id, index });
          if (s !== pts[index]) pts = pts.map((q, i) => (i === index ? s : q));
        }
        latest.current.onChange((t) =>
          kind === 'facet'
            ? { ...t, facets: t.facets.map((f) => (f.id === id ? { ...f, path: pts } : f)) }
            : { ...t, edges: t.edges.map((e) => (e.id === id ? { ...e, path: pts } : e)) },
        );
      };
      holder.listeners = [
        google.maps.event.addListener(path, 'set_at', (i: number) => commit(i)),
        google.maps.event.addListener(path, 'insert_at', (i: number) => commit(i)),
        google.maps.event.addListener(path, 'remove_at', () => commit()),
        google.maps.event.addListener(shape, 'click', () => onShapeClick({ kind, id })),
        google.maps.event.addListener(shape, 'rightclick', (e: google.maps.PolyMouseEvent) => {
          if (e.vertex === undefined || !shape.getEditable()) return;
          const min = kind === 'facet' ? 3 : 2;
          if (path.getLength() > min) path.removeAt(e.vertex);
        }),
      ];
    },
    [snap, onShapeClick],
  );

  // ---- sync facets + edges
  useEffect(() => {
    if (!map) return;
    const P = latest.current;
    const t = P.takeoff;
    const seen = new Set<string>();
    const sel = P.selection;
    const selecting = P.tool.mode === 'select';

    const upsert = (kind: 'facet' | 'edge', id: string, path: LatLng[], opts: google.maps.PolygonOptions | google.maps.PolylineOptions) => {
      seen.add(id);
      let rec = shapes.current.get(id);
      if (!rec) {
        const shape = kind === 'facet' ? new google.maps.Polygon({ map, paths: path, ...opts }) : new google.maps.Polyline({ map, path, ...opts });
        rec = { shape, listeners: [] };
        shapes.current.set(id, rec);
        bindPath(kind, id, shape, rec);
      } else {
        rec.shape.setOptions(opts);
        if (!samePath(rec.shape.getPath().getArray().map(toLL), path)) {
          suppress.current = true;
          if (kind === 'facet') (rec.shape as google.maps.Polygon).setPaths(path);
          else (rec.shape as google.maps.Polyline).setPath(path);
          suppress.current = false;
          bindPath(kind, id, rec.shape, rec);
        }
      }
    };

    if (t) {
      for (const f of t.facets) {
        const isSel = sel?.kind === 'facet' && sel.id === f.id;
        upsert('facet', f.id, f.path, {
          visible: P.visibility.FACETS,
          strokeColor: isSel ? SELECT_COLOR : FACET_COLOR,
          strokeWeight: isSel ? 3 : 1.5,
          strokeOpacity: 1,
          fillColor: f.hasExistingSolar ? '#fde047' : f.pitchRise === null ? '#f87171' : FACET_COLOR,
          fillOpacity: isSel ? 0.35 : 0.2,
          editable: isSel && selecting,
          zIndex: isSel ? 5 : 2,
        });
      }
      for (const e of t.edges) {
        const isSel = sel?.kind === 'edge' && sel.id === e.id;
        upsert('edge', e.id, e.path, {
          visible: P.visibility[e.type],
          strokeColor: EDGE_STYLE[e.type].color,
          strokeWeight: isSel ? 7 : 4,
          strokeOpacity: 1,
          editable: isSel && selecting,
          zIndex: isSel ? 8 : 4,
        });
      }
    }
    for (const [id, rec] of shapes.current) {
      if (!seen.has(id)) {
        rec.listeners.forEach((l) => l.remove());
        rec.shape.setMap(null);
        shapes.current.delete(id);
      }
    }
  }, [map, props.takeoff, props.selection, props.tool.mode, props.visibility, bindPath]);

  // ---- penetrations (Advanced Markers – require a mapId)
  useEffect(() => {
    if (!map || !markerLib) return;
    const P = latest.current;
    const seen = new Set<string>();
    for (const pen of P.takeoff?.penetrations ?? []) {
      seen.add(pen.id);
      const isSel = P.selection?.kind === 'penetration' && P.selection.id === pen.id;
      let m = markers.current.get(pen.id);
      if (!m) {
        const el = document.createElement('div');
        m = new markerLib.AdvancedMarkerElement({ map, position: pen.position, content: el, title: PENETRATION_LABEL[pen.type] });
        m.addEventListener('gmp-click', () => {
          if (latest.current.tool.mode === 'select') latest.current.onSelect({ kind: 'penetration', id: pen.id });
        });
        m.addListener('dragend', () => {
          const pos = m!.position as google.maps.LatLngLiteral | google.maps.LatLng | null;
          if (!pos) return;
          const ll = pos instanceof google.maps.LatLng ? toLL(pos) : { lat: pos.lat, lng: pos.lng };
          latest.current.onChange((t) => ({ ...t, penetrations: t.penetrations.map((x) => (x.id === pen.id ? { ...x, position: ll } : x)) }));
        });
        markers.current.set(pen.id, m);
      }
      const el = m.content as HTMLDivElement;
      el.style.cssText = `width:${isSel ? 16 : 12}px;height:${isSel ? 16 : 12}px;border-radius:50%;background:#f43f5e;border:2px solid ${isSel ? SELECT_COLOR : '#fff'};box-shadow:0 0 4px #000;transform:translateY(50%);`;
      m.position = pen.position;
      m.gmpDraggable = P.tool.mode === 'select';
      m.map = P.visibility.PENETRATIONS ? map : null;
    }
    for (const [id, m] of markers.current) {
      if (!seen.has(id)) {
        m.map = null;
        markers.current.delete(id);
      }
    }
  }, [map, markerLib, props.takeoff, props.selection, props.tool.mode, props.visibility]);

  // ---- measurement labels + address point
  useEffect(() => {
    if (!map || !markerLib) return;
    labels.current.forEach((m) => (m.map = null));
    labels.current = [];
    const P = latest.current;
    const mk = (pos: LatLng, html: string, cls = '') => {
      const el = document.createElement('div');
      el.innerHTML = html;
      el.className = cls;
      el.style.pointerEvents = 'none';
      const m = new markerLib.AdvancedMarkerElement({ map, position: pos, content: el, zIndex: 1000 });
      (m as any).element && ((m as any).element.style.pointerEvents = 'none');
      labels.current.push(m);
    };
    if (P.property?.coordinates) {
      mk(P.property.coordinates, '', 'w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-white translate-y-1/2');
    }
    if (P.visibility.LABELS && P.takeoff) {
      if (P.visibility.FACETS) {
        for (const f of P.takeoff.facets) {
          if (f.path.length < 3) continue;
          const m = measureFacet(f);
          mk(
            centroid(f.path),
            `<b>${escapeHtml(f.name)}</b> ${formatPitch(f.pitchRise)}<br>${m.roofAreaFt2 === null ? 'pitch?' : Math.round(m.roofAreaFt2).toLocaleString() + ' ft²'}`,
            'translate-y-1/2 text-[10px] leading-tight text-center font-semibold text-white bg-slate-900/80 rounded px-1 py-0.5 whitespace-nowrap',
          );
        }
      }
      for (const e of P.takeoff.edges) {
        if (!P.visibility[e.type] || e.path.length < 2) continue;
        const mid = midpointAlong(e.path);
        mk(
          mid,
          `${polylineLengthFt(e.path).toFixed(1)}′`,
          'translate-y-1/2 text-[10px] font-mono font-semibold text-white rounded px-1 whitespace-nowrap',
        );
        const el = labels.current[labels.current.length - 1].content as HTMLElement;
        el.style.background = EDGE_STYLE[e.type].color + 'dd';
      }
    }
  }, [map, markerLib, props.takeoff, props.visibility, props.property]);

  // ---- Google Solar segment bounding boxes (reference only – NOT plane outlines)
  useEffect(() => {
    if (!map) return;
    solarBoxes.current.forEach((b) => b.setMap(null));
    solarBoxes.current = [];
    const P = latest.current;
    if (!P.visibility.SOLAR_BOXES) return;
    const selFacet = P.selection?.kind === 'facet' ? P.takeoff?.facets.find((f) => f.id === (P.selection as any).id) : null;
    for (const s of P.property?.solar?.segments ?? []) {
      if (!s.boundingBox) continue;
      const { sw, ne } = s.boundingBox;
      const isSel =
        (P.selection?.kind === 'solarSegment' && P.selection.index === s.index) || (selFacet && selFacet.solarSegmentIndex === s.index);
      const line = new google.maps.Polyline({
        map,
        path: [sw, { lat: sw.lat, lng: ne.lng }, ne, { lat: ne.lat, lng: sw.lng }, sw],
        strokeOpacity: 0,
        icons: [
          {
            icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: isSel ? SELECT_COLOR : '#e2e8f0', scale: isSel ? 3 : 2 },
            offset: '0',
            repeat: '8px',
          },
        ],
        zIndex: 1,
        clickable: true,
      });
      line.addListener('click', () => onShapeClick({ kind: 'solarSegment', index: s.index }));
      solarBoxes.current.push(line);
    }
  }, [map, props.property, props.visibility, props.selection, props.takeoff, onShapeClick]);

  // ---- draft rendering
  useEffect(() => {
    if (!map || !markerLib) return;
    const P = latest.current;
    const color = P.tool.mode === 'edge' ? EDGE_STYLE[P.tool.edgeType].color : P.tool.mode === 'measure' ? '#f8fafc' : SELECT_COLOR;
    if (!draftLine.current) draftLine.current = new google.maps.Polyline({ map, clickable: false, zIndex: 20 });
    if (!rubber.current) rubber.current = new google.maps.Polyline({ map, clickable: false, zIndex: 20 });
    draftLine.current.setOptions({ path: P.draft, strokeColor: color, strokeWeight: 3, strokeOpacity: 1 });
    const last = P.draft[P.draft.length - 1];
    const rubberPath = last && P.cursor ? (P.tool.mode === 'facet' && P.draft.length >= 2 ? [last, P.cursor, P.draft[0]] : [last, P.cursor]) : [];
    rubber.current.setOptions({
      path: rubberPath,
      strokeOpacity: 0,
      icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: color, scale: 2 }, offset: '0', repeat: '6px' }],
    });
    draftDots.current.forEach((m) => (m.map = null));
    draftDots.current = P.draft.map((p, i) => {
      const el = document.createElement('div');
      const big = i === 0 && P.tool.mode === 'facet' && P.draft.length >= 3;
      el.style.cssText = `width:${big ? 14 : 9}px;height:${big ? 14 : 9}px;border-radius:50%;background:${big ? SELECT_COLOR : '#fff'};border:2px solid ${color};transform:translateY(50%);pointer-events:none;`;
      return new markerLib.AdvancedMarkerElement({ map, position: p, content: el, zIndex: 2000 });
    });
  }, [map, markerLib, props.draft, props.cursor, props.tool]);

  // ---- cleanup on unmount
  useEffect(
    () => () => {
      shapes.current.forEach((r) => r.shape.setMap(null));
      markers.current.forEach((m) => (m.map = null));
      labels.current.forEach((m) => (m.map = null));
      solarBoxes.current.forEach((b) => b.setMap(null));
      draftDots.current.forEach((m) => (m.map = null));
      draftLine.current?.setMap(null);
      rubber.current?.setMap(null);
    },
    [],
  );

  return null;
}

function midpointAlong(path: LatLng[]): LatLng {
  const total = polylineLengthFt(path);
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const seg = polylineLengthFt([path[i - 1], path[i]]);
    if (acc + seg >= total / 2) {
      const f = seg ? (total / 2 - acc) / seg : 0;
      return { lat: path[i - 1].lat + (path[i].lat - path[i - 1].lat) * f, lng: path[i - 1].lng + (path[i].lng - path[i - 1].lng) * f };
    }
    acc += seg;
  }
  return path[0];
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Loader2 } from 'lucide-react';
import type { PropertyRecord, Takeoff } from '../shared/types.ts';
import { EDGE_TYPES } from '../shared/types.ts';
import { api, ApiError, type ClientConfig, type Usage } from './api.ts';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { RoofMap } from './components/RoofMap.tsx';
import { MeasurePanel } from './components/MeasurePanel.tsx';
import { DiagnosticsModal } from './components/DiagnosticsModal.tsx';
import { ComplianceModal } from './components/ComplianceModal.tsx';
import { OverviewMap } from './components/OverviewMap.tsx';
import type { LayerKey, Selection, Tool, Visibility } from './editor.ts';

const initialVisibility = Object.fromEntries(
  [...EDGE_TYPES, 'FACETS', 'PENETRATIONS', 'SOLAR_BOXES', 'LABELS'].map((k) => [k, true]),
) as Visibility;

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export default function App() {
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [showDiag, setShowDiag] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const [overview, setOverview] = useState(false);

  // Editor state for the selected property
  const [draft, setDraft] = useState<Takeoff | null>(null);
  const [history, setHistory] = useState<{ past: Takeoff[]; future: Takeoff[] }>({ past: [], future: [] });
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [selection, setSelection] = useState<Selection>(null);
  const [tool, setTool] = useState<Tool>({ mode: 'select', edgeType: 'EAVE', penetrationType: 'PIPE_VENT' });
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);

  const property = properties.find((p) => p.id === selectedId) ?? null;
  const branches = [...new Set(properties.map((p) => p.branch).filter(Boolean))].sort();
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const refreshUsage = useCallback(() => api.usage().then(setUsage).catch(() => {}), []);

  useEffect(() => {
    api.config().then(setConfig).catch((e) => setConfigError(e.message));
    api.list().then((r) => {
      setProperties(r.properties);
      if (r.properties[0]) setSelectedId(r.properties[0].id);
    });
    refreshUsage();
  }, [refreshUsage]);

  // Load the selected property's takeoff into the editor
  useEffect(() => {
    setDraft(property ? structuredClone(property.takeoff) : null);
    setHistory({ past: [], future: [] });
    setSelection(null);
    setSaveState('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ---- persistence (debounced autosave)
  const saveTimer = useRef<number | undefined>(undefined);
  const flush = useCallback(async () => {
    window.clearTimeout(saveTimer.current);
    const t = draftRef.current;
    const id = selectedId;
    if (!t || !id) return;
    setSaveState('saving');
    try {
      const r = await api.saveTakeoff(id, t);
      setProperties((ps) => ps.map((p) => (p.id === id ? r.property : p)));
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [selectedId]);

  const onChange = useCallback(
    (fn: (t: Takeoff) => Takeoff) => {
      setDraft((cur) => {
        if (!cur) return cur;
        const next = { ...fn(cur), verified: null };
        setHistory((h) => ({ past: [...h.past.slice(-99), cur], future: [] }));
        return next;
      });
      setSaveState('dirty');
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => void flush(), 800);
    },
    [flush],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.past.length || !draftRef.current) return h;
      const prev = h.past[h.past.length - 1];
      const cur = draftRef.current;
      setDraft(prev);
      return { past: h.past.slice(0, -1), future: [cur, ...h.future] };
    });
    setSaveState('dirty');
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void flush(), 800);
  }, [flush]);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (!h.future.length || !draftRef.current) return h;
      const [next, ...rest] = h.future;
      const cur = draftRef.current;
      setDraft(next);
      return { past: [...h.past, cur], future: rest };
    });
    setSaveState('dirty');
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void flush(), 800);
  }, [flush]);

  // Warn before closing with unsaved edits
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (saveState === 'dirty' || saveState === 'saving') e.preventDefault();
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [saveState]);

  const selectProperty = useCallback(
    async (id: string) => {
      if (saveState === 'dirty') await flush();
      setSelectedId(id);
    },
    [saveState, flush],
  );

  const lookup = useCallback(
    async (q: { placeId?: string; address?: string; forceRefresh?: boolean; branch?: string }) => {
      setBusy(true);
      setLookupError(null);
      try {
        if (saveState === 'dirty') await flush();
        const r = await api.measure(q);
        setProperties((ps) => [r.property, ...ps.filter((p) => p.id !== r.property.id)]);
        setSelectedId(r.property.id);
        setOverview(false);
        // ensure editor reloads even if id unchanged (refresh)
        setDraft(structuredClone(r.property.takeoff));
      } catch (e) {
        setLookupError(e instanceof ApiError ? e.message : String(e));
      } finally {
        setBusy(false);
        refreshUsage();
      }
    },
    [saveState, flush, refreshUsage],
  );

  const verify = useCallback(async () => {
    if (!property) return;
    await flush();
    try {
      const r = await api.verify(property.id);
      setProperties((ps) => ps.map((p) => (p.id === r.property.id ? r.property : p)));
      setDraft(structuredClone(r.property.takeoff));
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }, [property, flush]);

  const remove = useCallback(async (id: string) => {
    await api.remove(id);
    setProperties((ps) => {
      const rest = ps.filter((p) => p.id !== id);
      if (id === selectedId) setSelectedId(rest[0]?.id ?? null);
      return rest;
    });
  }, [selectedId]);

  const setBranch = useCallback(async (branch: string) => {
    if (!selectedId) return;
    const r = await api.setBranch(selectedId, branch);
    setProperties((ps) => ps.map((p) => (p.id === r.property.id ? { ...p, branch: r.property.branch } : p)));
  }, [selectedId]);

  const toggleLayer = useCallback((k: LayerKey) => setVisibility((v) => ({ ...v, [k]: !v[k] })), []);

  const saveLabel = { idle: '', dirty: 'Unsaved changes…', saving: 'Saving…', saved: 'All changes saved', error: 'Save FAILED – check server' }[saveState];

  if (configError) return <Fatal msg={`Cannot reach the server: ${configError}`} />;
  if (!config) return <div className="h-full grid place-items-center"><Loader2 className="animate-spin text-cyan-400" /></div>;
  if (!config.browserKey) return <KeySetup />;

  return (
    <APIProvider apiKey={config.browserKey} libraries={['places', 'marker', 'geometry']}>
      <div className="h-full flex flex-col overflow-hidden">
        <Header usage={usage} sharedKeyWarning={config.sharedKeyWarning} onDiagnostics={() => setShowDiag(true)} saveState={saveLabel} overview={overview} onOverview={() => setOverview((o) => !o)} onCompliance={() => setShowCompliance(true)} />
        <main className="flex-1 flex min-h-0">
          <Sidebar properties={properties} selectedId={selectedId} onSelect={selectProperty} onDelete={remove} busy={busy} error={lookupError} onLookup={lookup} branches={branches} />
          <div className="flex-1 min-w-0 h-full">
            {overview ? (
              <OverviewMap
                properties={properties}
                mapId={config.mapId}
                selectedId={selectedId}
                onPick={(id) => {
                  void selectProperty(id);
                  setOverview(false);
                }}
              />
            ) : (
            <RoofMap
              property={property}
              takeoff={draft}
              mapId={config.mapId}
              onChange={onChange}
              selection={selection}
              onSelect={setSelection}
              tool={tool}
              setTool={setTool}
              visibility={visibility}
              toggleLayer={toggleLayer}
              canUndo={history.past.length > 0}
              canRedo={history.future.length > 0}
              onUndo={undo}
              onRedo={redo}
            />
            )}
          </div>
          <MeasurePanel
            property={property}
            takeoff={draft}
            onChange={onChange}
            selection={selection}
            onSelect={setSelection}
            visibility={visibility}
            toggleLayer={toggleLayer}
            onVerify={verify}
            onRefresh={() => property && lookup({ placeId: property.placeId ?? undefined, address: property.placeId ? undefined : property.formattedAddress, forceRefresh: true })}
            onBranch={setBranch}
            branches={branches}
            busy={busy}
          />
        </main>
        {showCompliance && <ComplianceModal onClose={() => setShowCompliance(false)} />}
        {showDiag && <DiagnosticsModal property={property} takeoff={draft} config={config} onClose={() => setShowDiag(false)} />}
      </div>
    </APIProvider>
  );
}

function KeySetup() {
  const [key, setKey] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setErr(null);
    const r = await fetch('/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) location.reload();
    else setErr(j.error || `HTTP ${r.status}`);
  };
  return (
    <div className="h-full grid place-items-center p-6">
      <form
        className="w-full max-w-md space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h1 className="font-bold">Paste your Google Maps API key</h1>
        <p className="text-xs text-slate-400">Saved to the local <code>.env</code> file on this computer (never committed to git). You only do this once.</p>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="AIza…"
          aria-label="Google Maps API key"
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm font-mono"
        />
        {err && <p className="text-xs text-red-300">{err}</p>}
        <button className="w-full py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-sm font-semibold">Save and start</button>
      </form>
    </div>
  );
}

function Fatal({ msg }: { msg: string }) {
  return <div className="h-full grid place-items-center p-8 text-center text-red-300 text-sm">{msg}</div>;
}

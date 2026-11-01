import { useState } from 'react';
import { CheckCircle2, CircleDashed, Trash2, Satellite, AlertTriangle } from 'lucide-react';
import type { PropertyRecord } from '../../shared/types.ts';
import { computeTotals } from '../../shared/measure.ts';
import { AddressSearch } from './AddressSearch.tsx';

interface Props {
  properties: PropertyRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
  error: string | null;
  onLookup: (q: { placeId?: string; address?: string; branch?: string }) => void;
  branches: string[];
}

export function Sidebar(p: Props) {
  const [filter, setFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const list = p.properties.filter(
    (x) =>
      (x.formattedAddress + x.inputAddress + x.branch).toLowerCase().includes(filter.toLowerCase()) &&
      (!branchFilter || (branchFilter === '__none' ? !x.branch : x.branch === branchFilter)),
  );
  return (
    <aside className="w-80 shrink-0 h-full flex flex-col bg-slate-900 border-r border-slate-800 min-h-0">
      <div className="p-4 border-b border-slate-800 space-y-3">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">New measurement</h2>
        <AddressSearch busy={p.busy} onSubmit={(q) => p.onLookup({ ...q, branch: newBranch || undefined })} />
        <input
          value={newBranch}
          onChange={(e) => setNewBranch(e.target.value)}
          list="branch-list-new"
          aria-label="Branch for new lookups"
          placeholder="Branch for new lookups (optional)"
          className="w-full bg-slate-800/70 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <datalist id="branch-list-new">{p.branches.map((b) => <option key={b} value={b} />)}</datalist>
        {p.busy && <p className="text-[11px] text-cyan-300">Calling Geocoding + Solar API on the server…</p>}
        {p.error && (
          <p role="alert" className="text-[11px] text-red-300 bg-red-950/40 border border-red-900 rounded p-2 break-words">
            {p.error}
          </p>
        )}
      </div>
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Saved assessments ({list.length})</h2>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          aria-label="Filter by branch"
          className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-[11px] text-slate-200 max-w-32"
        >
          <option value="">All branches</option>
          {p.branches.map((b) => <option key={b} value={b}>{b}</option>)}
          <option value="__none">No branch</option>
        </select>
      </div>
      <div className="px-4 pb-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter…"
          className="w-full bg-slate-800/70 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>
      <ul className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {list.length === 0 && <li className="text-xs text-slate-500 px-2 py-6 text-center">No saved assessments yet.</li>}
        {list.map((x) => {
          const t = computeTotals(x.takeoff);
          const sel = x.id === p.selectedId;
          return (
            <li key={x.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => p.onSelect(x.id)}
                onKeyDown={(e) => e.key === 'Enter' && p.onSelect(x.id)}
                className={`group w-full text-left rounded-lg px-3 py-2 border cursor-pointer ${sel ? 'bg-slate-800 border-cyan-600' : 'border-transparent hover:bg-slate-800/60'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-100 leading-snug">{x.formattedAddress}</p>
                  <button
                    title="Delete assessment"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete ${x.formattedAddress}?`)) p.onDelete(x.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                  {x.status === 'VERIFIED' ? (
                    <span className="flex items-center gap-1 text-emerald-300"><CheckCircle2 size={11} /> Verified</span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400"><CircleDashed size={11} /> {x.status === 'MEASURED' ? 'Measured – not verified' : 'Not measured'}</span>
                  )}
                  {x.solarStatus.state === 'OK' ? (
                    <span className="flex items-center gap-1 text-sky-300"><Satellite size={11} /> Google Solar</span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-300"><AlertTriangle size={11} /> No Solar data</span>
                  )}
                  {t.squares !== null && <span className="font-mono text-slate-300">{t.squares.toFixed(1)} sq</span>}
                  {x.branch && <span className="rounded bg-slate-700 px-1 text-slate-200">{x.branch}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

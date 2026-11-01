import { Activity, Hammer, ShieldAlert } from 'lucide-react';
import type { Usage } from '../api.ts';

export function Header(p: { usage: Usage | null; sharedKeyWarning: boolean; onDiagnostics: () => void; saveState: string }) {
  return (
    <header className="h-12 shrink-0 flex items-center gap-4 px-4 bg-slate-900 border-b border-slate-800">
      <div className="flex items-center gap-2">
        <Hammer size={18} className="text-cyan-400" />
        <span className="font-bold text-sm">ForgeOne Roof Measure</span>
        <span className="text-[10px] font-mono text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">DEV PROTOTYPE</span>
      </div>
      {p.sharedKeyWarning && (
        <span className="hidden lg:flex items-center gap-1 text-[11px] text-amber-300" title="Set GOOGLE_MAPS_SERVER_KEY and GOOGLE_MAPS_BROWSER_KEY separately in .env">
          <ShieldAlert size={13} /> One API key is used for browser + server. Split it before production.
        </span>
      )}
      <div className="ml-auto flex items-center gap-4">
        <span className="text-[11px] text-slate-400" data-testid="save-state">{p.saveState}</span>
        {p.usage && (
          <span className="text-[11px] font-mono text-slate-400" title="Requests made by this app today (app-enforced caps)">
            Today: Solar {p.usage.solar}/{p.usage.limits.solar} · Geocode {p.usage.geocode}/{p.usage.limits.geocode} · AddrVal {p.usage.addressValidation}/{p.usage.limits.addressValidation}
          </span>
        )}
        <button onClick={p.onDiagnostics} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold">
          <Activity size={14} className="text-cyan-400" /> API diagnostics
        </button>
      </div>
    </header>
  );
}

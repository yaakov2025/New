import { CheckCircle2, X, XCircle } from 'lucide-react';
import type { PropertyRecord, Provenance, Takeoff } from '../../shared/types.ts';
import { M2_TO_FT2, computeTotals } from '../../shared/measure.ts';
import { Src } from './MeasurePanel.tsx';
import type { ClientConfig } from '../api.ts';

export function DiagnosticsModal({ property, takeoff, config, onClose }: { property: PropertyRecord | null; takeoff: Takeoff | null; config: ClientConfig | null; onClose: () => void }) {
  const steps = property?.diagnostics ?? [];
  const geo = steps.filter((s) => s.service === 'GEOCODING').at(-1);
  const sol = steps.filter((s) => s.service === 'SOLAR_BUILDING_INSIGHTS').at(-1);
  const tot = takeoff ? computeTotals(takeoff) : null;
  const s = property?.solar;

  const fields: Array<{ name: string; value: string | null; src: Provenance; field: string }> = property
    ? [
        { name: 'Formatted address', value: property.formattedAddress, src: 'GOOGLE_GEOCODING', field: 'Geocoding results[0].formatted_address' },
        { name: 'Place ID', value: property.placeId, src: 'GOOGLE_GEOCODING', field: 'Geocoding results[0].place_id' },
        { name: 'Coordinates', value: property.coordinates ? `${property.coordinates.lat.toFixed(6)}, ${property.coordinates.lng.toFixed(6)}` : null, src: 'GOOGLE_GEOCODING', field: 'Geocoding results[0].geometry.location' },
        { name: 'Google building', value: s?.buildingName ?? null, src: 'GOOGLE_SOLAR', field: 'buildingInsights.name' },
        { name: 'Whole roof area', value: s?.wholeRoofAreaMeters2 != null ? `${s.wholeRoofAreaMeters2.toFixed(1)} m²` : null, src: 'GOOGLE_SOLAR', field: 'solarPotential.wholeRoofStats.areaMeters2' },
        { name: 'Whole roof area (ft²)', value: s?.wholeRoofAreaMeters2 != null ? `${Math.round(s.wholeRoofAreaMeters2 * M2_TO_FT2)} ft²` : null, src: 'CALCULATED', field: 'areaMeters2 × 10.7639' },
        { name: 'Segment pitch / azimuth / area', value: s ? `${s.segments.length} segments` : null, src: 'GOOGLE_SOLAR', field: 'solarPotential.roofSegmentStats[].pitchDegrees, azimuthDegrees, stats.areaMeters2' },
        { name: 'Segment pitch as x/12', value: s ? 'per segment' : null, src: 'CALCULATED', field: '12 × tan(pitchDegrees)' },
        { name: 'Traced roof area', value: tot?.roofAreaFt2 != null ? `${Math.round(tot.roofAreaFt2)} ft²` : null, src: 'MANUAL', field: 'Σ facet plan area × √(1+(rise/12)²)' },
        { name: 'Eave / rake / ridge / hip / valley lengths', value: tot && takeoff!.edges.length ? `${takeoff!.edges.length} traced lines` : null, src: 'MANUAL', field: 'Geodesic length of traced lines' },
        { name: 'Penetrations', value: takeoff?.penetrations.length ? `${takeoff.penetrations.length} marked` : null, src: 'MANUAL', field: 'Markers placed by user' },
        { name: 'Edge lines from Google', value: null, src: 'UNAVAILABLE', field: 'Solar API does not return roof edge lines' },
        { name: 'Roof plane outlines from Google', value: null, src: 'UNAVAILABLE', field: 'Solar API returns bounding boxes only, not plane polygons' },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div role="dialog" aria-label="API diagnostics" className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl bg-slate-900 border border-slate-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="font-bold">API diagnostics</h2>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4 text-xs">
          <section className="grid grid-cols-2 gap-3">
            <Status label="Geocoding" ok={geo?.ok} detail={geo?.message} />
            <Status label="Solar API buildingInsights" ok={sol?.ok} detail={property ? property.solarStatus.message : undefined} />
          </section>
          {property?.solarStatus.fix && <p className="rounded bg-amber-950/50 border border-amber-800 p-2 text-amber-200"><b>Fix:</b> {property.solarStatus.fix}</p>}
          <section>
            <h3 className="font-bold text-slate-300 mb-1">Property identified</h3>
            <p className="text-slate-200">{property?.formattedAddress ?? '—'}</p>
          </section>
          <section>
            <h3 className="font-bold text-slate-300 mb-1">Where every measurement comes from</h3>
            <table className="w-full">
              <tbody>
                {fields.map((f) => (
                  <tr key={f.name} className="border-t border-slate-800">
                    <td className="py-1 pr-2 text-slate-300">{f.name}</td>
                    <td className="py-1 pr-2 font-mono text-slate-100">{f.value ?? <span className="italic text-slate-500">Not available</span>}</td>
                    <td className="py-1 pr-2"><Src kind={f.value === null ? 'UNAVAILABLE' : f.src} /></td>
                    <td className="py-1 text-[10px] text-slate-500 font-mono">{f.field}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <h3 className="font-bold text-slate-300 mb-1">Request log (last lookup, credentials redacted)</h3>
            <ul className="space-y-1 font-mono text-[11px]" data-testid="diag-log">
              {steps.map((d, i) => (
                <li key={i} className={`rounded p-2 border ${d.ok ? 'border-emerald-900 bg-emerald-950/30' : 'border-red-900 bg-red-950/30'}`}>
                  <span className="font-bold">{d.service}</span> {d.httpStatus ? `HTTP ${d.httpStatus}` : ''} {d.googleStatus ?? ''} {d.reason ? `· ${d.reason}` : ''}
                  <div className="text-slate-300 break-words">{d.message}</div>
                </li>
              ))}
              {!steps.length && <li className="text-slate-500">No lookup recorded.</li>}
            </ul>
          </section>
          {config && (
            <section className="text-slate-400">
              Server key configured: {config.serverKeyConfigured ? 'yes' : 'NO'} · Map ID: {config.mapId} · Expected project #{config.expectedProjectNumber}
              {config.sharedKeyWarning && <span className="text-amber-300"> · one key shared by browser and server</span>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Status({ label, ok, detail }: { label: string; ok?: boolean; detail?: string }) {
  return (
    <div className={`rounded-lg border p-3 ${ok ? 'border-emerald-800 bg-emerald-950/30' : ok === false ? 'border-red-800 bg-red-950/30' : 'border-slate-800'}`}>
      <div className="flex items-center gap-1.5 font-bold">
        {ok ? <CheckCircle2 size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-red-400" />} {label}: {ok ? 'succeeded' : ok === false ? 'failed' : 'not run'}
      </div>
      {detail && <p className="mt-1 text-slate-300 break-words">{detail}</p>}
    </div>
  );
}

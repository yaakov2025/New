import { X } from 'lucide-react';

export function ComplianceModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div role="dialog" aria-label="Data & compliance" className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-xs text-slate-300" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="font-bold text-sm text-slate-100">Data storage & Google Maps Platform compliance</h2>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4">
          <section>
            <h3 className="font-bold text-slate-100 mb-2">What this app stores, and for how long</h3>
            <table className="w-full">
              <tbody className="[&_td]:py-1.5 [&_td]:pr-3 [&_tr]:border-t [&_tr]:border-slate-800">
                <tr><td className="font-semibold text-emerald-300">Kept indefinitely</td><td>Google Place IDs. Your own traced facets, lines, penetrations, notes, existing-solar inspection.</td></tr>
                <tr><td className="font-semibold text-amber-300">Deleted after 30 days</td><td>Geocoded latitude/longitude. Google Solar building insights (roof stats, segments). Checked at start-up, hourly and whenever the list loads.</td></tr>
                <tr><td className="font-semibold text-red-300">Never stored</td><td>Map tiles, satellite imagery, Street View, routes. The browser displays them directly from Google. The server never downloads them.</td></tr>
              </tbody>
            </table>
          </section>
          <section>
            <h3 className="font-bold text-slate-100 mb-1">Where Google is called</h3>
            <p>Geocoding, Address Validation and Solar are called <b>only by the server</b>. The browser only loads Maps JavaScript (map + Places autocomplete). Server errors are redacted before they reach logs or the screen.</p>
          </section>
          <section>
            <h3 className="font-bold text-slate-100 mb-1">Products used</h3>
            <p>Maps JavaScript API (Advanced Markers, mapId) · Places UI Kit (Basic Place Autocomplete) · Geocoding API · Address Validation API · Solar API (buildingInsights:findClosest).</p>
          </section>
          <section>
            <h3 className="font-bold text-slate-100 mb-1">Cost</h3>
            <p>Every Google request may be billed to your Cloud project. This app caps its own daily requests (see header) and reuses cached Solar data instead of calling again. Your budget alert is a notification, not a spending limit.</p>
          </section>
          <section>
            <h3 className="font-bold text-slate-100 mb-1">Terms</h3>
            <p>
              Use is subject to the{' '}
              <a className="text-cyan-300 underline" href="https://cloud.google.com/maps-platform/terms" target="_blank" rel="noreferrer">Google Maps Platform Terms of Service</a>{' '}
              and the{' '}
              <a className="text-cyan-300 underline" href="https://cloud.google.com/maps-platform/terms/maps-service-terms" target="_blank" rel="noreferrer">Service Specific Terms</a>. Keep Google's attribution visible on the map. Restrict your API keys:{' '}
              <a className="text-cyan-300 underline" href="https://cloud.google.com/docs/authentication/api-keys#adding-api-restrictions" target="_blank" rel="noreferrer">API key restrictions</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

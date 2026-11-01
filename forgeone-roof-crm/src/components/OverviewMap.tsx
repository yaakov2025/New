import { useEffect } from 'react';
import { AdvancedMarker, Map, Pin, useMap } from '@vis.gl/react-google-maps';
import type { PropertyRecord } from '../../shared/types.ts';
import { computeTotals } from '../../shared/measure.ts';
import { propertyCenter } from './RoofMap.tsx';

const US = { north: 49.5, south: 24.3, west: -125, east: -66.8 };

/** Every saved assessment as a pin. Click a pin to open it. */
export function OverviewMap({ properties, mapId, selectedId, onPick }: { properties: PropertyRecord[]; mapId: string; selectedId: string | null; onPick: (id: string) => void }) {
  const placed = properties
    .map((p) => ({ p, at: propertyCenter(p, p.takeoff) }))
    .filter((x): x is { p: PropertyRecord; at: { lat: number; lng: number } } => !!x.at);
  const missing = properties.length - placed.length;
  return (
    <div className="relative h-full w-full">
      <Map mapId={mapId} style={{ width: '100%', height: '100%' }} defaultBounds={US} gestureHandling="greedy" mapTypeId="roadmap" streetViewControl={false} fullscreenControl={false} mapTypeControl={false}>
        <FitAll points={placed.map((x) => x.at)} />
        {placed.map(({ p, at }) => {
          const t = computeTotals(p.takeoff);
          const color = p.status === 'VERIFIED' ? '#10b981' : p.status === 'MEASURED' ? '#0ea5e9' : '#f59e0b';
          return (
            <AdvancedMarker key={p.id} position={at} title={`${p.formattedAddress}${t.squares !== null ? ` · ${t.squares.toFixed(1)} sq` : ''}`} onClick={() => onPick(p.id)} zIndex={p.id === selectedId ? 10 : 1}>
              <Pin background={color} borderColor={p.id === selectedId ? '#facc15' : '#0f172a'} glyphColor="#fff" scale={p.id === selectedId ? 1.3 : 1} />
            </AdvancedMarker>
          );
        })}
      </Map>
      <div className="absolute top-3 left-3 rounded-lg bg-slate-900/95 border border-slate-700 p-3 text-xs space-y-1 shadow-xl">
        <p className="font-bold">All assessments ({properties.length})</p>
        <p className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Not measured</p>
        <p className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Measured</p>
        <p className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Verified</p>
        {missing > 0 && <p className="text-slate-400">{missing} not shown: location expired (30-day limit) and nothing traced.</p>}
        <p className="text-slate-500">Click a pin to open it.</p>
      </div>
    </div>
  );
}

function FitAll({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|');
  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(12);
      return;
    }
    const b = new google.maps.LatLngBounds();
    points.forEach((p) => b.extend(p));
    map.fitBounds(b, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

import type { EdgeType, PenetrationType } from '../shared/types.ts';

export type ToolMode = 'select' | 'facet' | 'edge' | 'penetration' | 'measure';

export interface Tool {
  mode: ToolMode;
  edgeType: EdgeType;
  penetrationType: PenetrationType;
}

export type Selection =
  | { kind: 'facet'; id: string }
  | { kind: 'edge'; id: string }
  | { kind: 'penetration'; id: string }
  | { kind: 'solarSegment'; index: number }
  | null;

export type LayerKey = EdgeType | 'FACETS' | 'PENETRATIONS' | 'SOLAR_BOXES' | 'LABELS';

export type Visibility = Record<LayerKey, boolean>;

export const EDGE_STYLE: Record<EdgeType, { label: string; color: string }> = {
  EAVE: { label: 'Eave', color: '#10b981' },
  RAKE: { label: 'Rake', color: '#a855f7' },
  RIDGE: { label: 'Ridge', color: '#ef4444' },
  HIP: { label: 'Hip', color: '#f97316' },
  VALLEY: { label: 'Valley', color: '#06b6d4' },
  WALL_FLASHING: { label: 'Wall flashing', color: '#eab308' },
  STEP_FLASHING: { label: 'Step flashing', color: '#f472b6' },
};

export const PENETRATION_LABEL: Record<PenetrationType, string> = {
  PIPE_VENT: 'Pipe vent',
  BOX_VENT: 'Box vent',
  SKYLIGHT: 'Skylight',
  CHIMNEY: 'Chimney',
  EXHAUST_FAN: 'Exhaust fan',
  OTHER: 'Other',
};

export const FACET_COLOR = '#38bdf8';
export const SELECT_COLOR = '#facc15';

export const newId = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

export const fmtFt = (n: number | null | undefined, d = 0) =>
  n === null || n === undefined ? null : `${n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d })}`;

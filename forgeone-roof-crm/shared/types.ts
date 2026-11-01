// Shared data contract used by the web client, the Express API, and (later) the
// iOS / Android apps. Keep this file free of DOM, Node, or Google Maps SDK types.

export interface LatLng {
  lat: number;
  lng: number;
}

/** Where a number came from. Shown next to every measurement in the UI. */
export type Provenance =
  | 'GOOGLE_SOLAR' // copied straight from a Solar API response field
  | 'GOOGLE_GEOCODING' // copied from a Geocoding API response field
  | 'CALCULATED' // derived arithmetically from Google fields (e.g. degrees -> x:12)
  | 'MANUAL' // measured from geometry a person traced on the imagery
  | 'UNAVAILABLE'; // nobody has supplied it yet

export type EdgeType =
  | 'EAVE'
  | 'RAKE'
  | 'RIDGE'
  | 'HIP'
  | 'VALLEY'
  | 'WALL_FLASHING'
  | 'STEP_FLASHING';

export const EDGE_TYPES: EdgeType[] = [
  'EAVE',
  'RAKE',
  'RIDGE',
  'HIP',
  'VALLEY',
  'WALL_FLASHING',
  'STEP_FLASHING',
];

export type PenetrationType = 'PIPE_VENT' | 'BOX_VENT' | 'SKYLIGHT' | 'CHIMNEY' | 'EXHAUST_FAN' | 'OTHER';

export const PENETRATION_TYPES: PenetrationType[] = [
  'PIPE_VENT',
  'BOX_VENT',
  'SKYLIGHT',
  'CHIMNEY',
  'EXHAUST_FAN',
  'OTHER',
];

/** A roof plane traced by a person on the satellite image. */
export interface Facet {
  id: string;
  name: string;
  /** Polygon ring as seen from above (plan view), not closed (first != last). */
  path: LatLng[];
  /** Rise per 12 in of run. null = not set yet. */
  pitchRise: number | null;
  pitchSource: 'MANUAL' | 'GOOGLE_SOLAR_SEGMENT' | null;
  /** If pitch came from Google, which roofSegmentStats[] entry. */
  solarSegmentIndex?: number;
  hasExistingSolar: boolean;
}

export interface Edge {
  id: string;
  type: EdgeType;
  /** Polyline in plan view. */
  path: LatLng[];
}

export interface Penetration {
  id: string;
  type: PenetrationType;
  position: LatLng;
}

export interface ExistingSolar {
  /** null = not inspected yet. Never inferred automatically. */
  present: boolean | null;
  panelCount: number | null;
  notes: string;
}

export interface Takeoff {
  facets: Facet[];
  edges: Edge[];
  penetrations: Penetration[];
  existingSolar: ExistingSolar;
  notes: string;
  /** Set only when a person marks the takeoff verified and all checks pass. */
  verified: { at: string; checksPassed: string[] } | null;
  updatedAt: string;
}

/** One entry of solarPotential.roofSegmentStats[] (field names mirror Google's). */
export interface SolarSegment {
  index: number;
  pitchDegrees: number | null;
  azimuthDegrees: number | null;
  areaMeters2: number | null; // stats.areaMeters2
  groundAreaMeters2: number | null; // stats.groundAreaMeters2
  planeHeightAtCenterMeters: number | null;
  center: LatLng | null;
  /** Axis-aligned bounding box. NOT the roof plane outline. */
  boundingBox: { sw: LatLng; ne: LatLng } | null;
}

export interface SolarInsights {
  buildingName: string | null; // name, e.g. "buildings/ChIJ..."
  center: LatLng | null;
  boundingBox: { sw: LatLng; ne: LatLng } | null;
  imageryDate: string | null; // YYYY-MM-DD
  imageryProcessedDate: string | null;
  imageryQuality: string | null; // HIGH | MEDIUM | BASE
  postalCode: string | null;
  wholeRoofAreaMeters2: number | null; // solarPotential.wholeRoofStats.areaMeters2
  wholeRoofGroundAreaMeters2: number | null; // solarPotential.wholeRoofStats.groundAreaMeters2
  maxArrayPanelsCount: number | null;
  maxArrayAreaMeters2: number | null;
  panelCapacityWatts: number | null;
  maxSunshineHoursPerYear: number | null;
  segments: SolarSegment[];
  /** Distance from the geocoded point to the building Google picked. */
  distanceFromGeocodeMeters: number | null;
  fetchedAt: string;
  expiresAt: string; // 30-day cache limit
}

export type SolarState =
  | 'OK'
  | 'NO_COVERAGE' // 404 – Google has no building model here
  | 'KEY_BLOCKED' // API_KEY_SERVICE_BLOCKED – key restrictions exclude Solar
  | 'API_DISABLED' // SERVICE_DISABLED – API not enabled on project
  | 'QUOTA' // 429 / app usage guard
  | 'ERROR'
  | 'NOT_REQUESTED'
  | 'EXPIRED'; // cached Solar data passed the 30-day limit and was purged

export interface SolarStatus {
  state: SolarState;
  message: string;
  /** Plain-language fix the user can apply in Google Cloud Console. */
  fix?: string;
}

export interface DiagnosticStep {
  at: string;
  service: 'ADDRESS_VALIDATION' | 'GEOCODING' | 'SOLAR_BUILDING_INSIGHTS' | 'USAGE_GUARD' | 'CACHE';
  ok: boolean;
  httpStatus?: number;
  googleStatus?: string; // e.g. OK, REQUEST_DENIED, PERMISSION_DENIED
  reason?: string; // e.g. API_KEY_SERVICE_BLOCKED
  message: string;
}

export interface AddressValidationSummary {
  formattedAddress: string | null;
  validationGranularity: string | null;
  addressComplete: boolean | null;
  hasUnconfirmedComponents: boolean | null;
  dpvConfirmation: string | null;
}

export type PipelineStatus = 'NEW' | 'MEASURING' | 'MEASURED' | 'VERIFIED';

export interface PropertyRecord {
  id: string;
  inputAddress: string;
  formattedAddress: string;
  /** Tier 1 – may be stored indefinitely. */
  placeId: string | null;
  /** Tier 2 – purged 30 days after cachedAt. */
  coordinates: (LatLng & { cachedAt: string; expiresAt: string }) | null;
  addressValidation: AddressValidationSummary | null;
  solar: SolarInsights | null;
  solarStatus: SolarStatus;
  takeoff: Takeoff;
  status: PipelineStatus;
  diagnostics: DiagnosticStep[];
  createdAt: string;
  updatedAt: string;
}

export function emptyTakeoff(): Takeoff {
  return {
    facets: [],
    edges: [],
    penetrations: [],
    existingSolar: { present: null, panelCount: null, notes: '' },
    notes: '',
    verified: null,
    updatedAt: new Date().toISOString(),
  };
}

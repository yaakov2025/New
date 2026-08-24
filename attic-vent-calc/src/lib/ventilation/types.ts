export type RoofType = "gable" | "hip" | "combination" | "shed";
export type HouseStyleId = "ranch" | "colonial" | "cape" | "craftsman" | "hip" | "shed";
export type ClimateZone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type TargetMode = "code-150" | "code-300" | "warranty";
export type VentRole = "intake" | "exhaust" | "mechanical";
export type VentUnit = "each" | "lf";
export type Severity = "ok" | "info" | "warn" | "fail";

export interface VentProduct {
  id: string;
  name: string;
  shortName: string;
  role: VentRole;
  unit: VentUnit;
  /** Typical published net free area per unit or per linear foot (sq in). */
  nfa: number;
  /** Default CFM for mechanical fans. */
  cfm?: number;
  sizeNote: string;
  source: string;
  mixGroup: "soffit" | "drip" | "ridge" | "offridge" | "gable" | "turbine" | "dome" | "fan" | "custom";
}

export interface VentLine {
  id: string;
  productId: string;
  quantity: number;
  nfaOverride: number | null;
  cfmOverride: number | null;
}

export interface Project {
  name: string;
  lengthFt: number;
  widthFt: number;
  useTotalArea: boolean;
  totalSqFt: number;
  climateZone: ClimateZone;
  hasVaporRetarder: boolean;
  targetMode: TargetMode;
  roofType: RoofType;
  houseStyle: HouseStyleId;
  geometryCustom: boolean;
  ridgeLengthFt: number;
  eaveLengthFt: number;
  darkOrSteepRoof: boolean;
  bafflesInstalled: boolean;
  vents: VentLine[];
}

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
}

export interface Suggestion {
  id: string;
  productId: string;
  quantity: number;
  label: string;
  detail: string;
  covers: "intake" | "exhaust";
}

export interface LineResult {
  line: VentLine;
  product: VentProduct;
  nfaEach: number;
  nfaTotal: number;
  cfmTotal: number;
}

export interface CalcResult {
  atticSqFt: number;
  ratio: 150 | 300;
  requiredTotalSqIn: number;
  requiredIntakeSqIn: number;
  requiredExhaustSqIn: number;
  highMinSqIn: number;
  highMaxSqIn: number;
  providedIntakeSqIn: number;
  providedExhaustSqIn: number;
  providedTotalSqIn: number;
  intakeDelta: number;
  exhaustDelta: number;
  highShareOfRequired: number;
  fanCfm: number;
  fanMakeupSqIn: number;
  intakeVsMakeup: number;
  climateEligible300: boolean;
  placementEligible300: boolean;
  canClaim300: boolean;
  codePass: boolean;
  warrantyPass: boolean;
  meetsTarget: boolean;
  balanced: boolean;
  lines: LineResult[];
  findings: Finding[];
  suggestions: Suggestion[];
  mix: {
    hasRidge: boolean;
    hasGable: boolean;
    hasTurbine: boolean;
    hasDome: boolean;
    hasFan: boolean;
    competingExhaust: boolean;
  };
}

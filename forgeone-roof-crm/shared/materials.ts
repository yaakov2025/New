// Material quantities derived ONLY from measured takeoff totals. If an input is
// missing (e.g. no pitch => no roof area) the line item reports null.
import type { TakeoffTotals } from './measure.ts';

export type MaterialSystem = 'ASPHALT_SHINGLE' | 'STANDING_SEAM_METAL' | 'CONCRETE_TILE' | 'TPO_MEMBRANE';

export const MATERIAL_SYSTEMS: Record<MaterialSystem, string> = {
  ASPHALT_SHINGLE: 'Architectural asphalt shingle',
  STANDING_SEAM_METAL: 'Standing seam metal (24ga)',
  CONCRETE_TILE: 'Concrete / clay "S" tile',
  TPO_MEMBRANE: 'TPO 60-mil membrane (low slope)',
};

export interface MaterialLine {
  key: string;
  item: string;
  basis: string;
  quantity: number | null;
  unit: string;
  unitCost: number;
}

export interface MaterialOptions {
  system: MaterialSystem;
  wastePct: number; // e.g. 10
  prices: Record<string, number>; // override unit costs by key
}

export const DEFAULT_PRICES: Record<string, number> = {
  shingles: 42,
  starter: 55,
  hipRidgeCap: 68,
  underlayment: 95,
  iceWater: 120,
  dripEdge: 12,
  valleyMetal: 28,
  nails: 65,
  pipeBoots: 18,
  metalPanels: 525,
  ridgeTrim: 38,
  eaveTrim: 22,
  rakeTrim: 26,
  highTempUnderlayment: 165,
  clips: 90,
  fieldTile: 3.25,
  tileCaps: 4.5,
  tileUnderlayment: 110,
  battens: 9,
  tileScrews: 75,
  birdStop: 14,
  tpoRolls: 1150,
  polyiso: 48,
  plates: 160,
  bondingAdhesive: 330,
  edgeMetal: 38,
  tpoFlashing: 155,
};

const ceil = (n: number | null) => (n === null ? null : Math.ceil(n - 1e-9));

export function materialLines(t: TakeoffTotals, o: MaterialOptions): MaterialLine[] {
  const w = 1 + o.wastePct / 100;
  const sq = t.squares === null ? null : t.squares * w;
  const eave = t.edgeFt.EAVE;
  const rake = t.edgeFt.RAKE;
  const ridge = t.edgeFt.RIDGE;
  const hip = t.edgeFt.HIP;
  const valley = t.edgeFt.VALLEY;
  const pipes = t.penetrationCounts.PIPE_VENT ?? 0;
  const price = (k: string) => o.prices[k] ?? DEFAULT_PRICES[k] ?? 0;
  const line = (key: string, item: string, basis: string, quantity: number | null, unit: string): MaterialLine => ({
    key,
    item,
    basis,
    quantity,
    unit,
    unitCost: price(key),
  });

  if (o.system === 'ASPHALT_SHINGLE') {
    return [
      line('shingles', 'Architectural shingles', `roof squares × ${w.toFixed(2)} waste × 3 bundles/sq`, ceil(sq === null ? null : sq * 3), 'bundle'),
      line('starter', 'Starter strip', '(eaves + rakes) ÷ 100 ft/bundle', ceil((eave + rake) / 100), 'bundle'),
      line('hipRidgeCap', 'Hip & ridge cap', '(ridges + hips) ÷ 25 ft/bundle', ceil((ridge + hip) / 25), 'bundle'),
      line('underlayment', 'Synthetic underlayment', 'roof squares × waste ÷ 10 sq/roll', ceil(sq === null ? null : sq / 10), 'roll'),
      line('iceWater', 'Ice & water shield', '(valleys + eaves × 3 ft) ÷ 66 ft/roll (3 ft wide)', ceil((valley + eave) / 66), 'roll'),
      line('dripEdge', 'Drip edge', '(eaves + rakes) × 1.1 ÷ 10 ft/stick', ceil(((eave + rake) * 1.1) / 10), 'stick'),
      line('valleyMetal', 'W-valley metal', 'valleys × 1.1 ÷ 10 ft/stick', ceil((valley * 1.1) / 10), 'stick'),
      line('nails', 'Coil nails', 'roof squares × waste ÷ 16 sq/box', ceil(sq === null ? null : sq / 16), 'box'),
      line('pipeBoots', 'Pipe boots', 'pipe vents marked on map', pipes, 'each'),
    ];
  }
  if (o.system === 'CONCRETE_TILE') {
    return [
      line('fieldTile', 'Field tile', 'roof squares × waste × 90 tiles/sq', ceil(sq === null ? null : sq * 90), 'tile'),
      line('tileCaps', 'Hip & ridge cap tile', '(ridges + hips) × 1.1 ÷ 1.4 ft/cap', ceil(((ridge + hip) * 1.1) / 1.4), 'cap'),
      line('tileUnderlayment', 'Self-adhered underlayment (2 layers)', 'roof squares × waste × 2 ÷ 2 sq/roll', ceil(sq === null ? null : sq), 'roll'),
      line('battens', '1×2 treated battens', 'roof area × waste ÷ 1.15 ft² per lf ÷ 8 ft', ceil(sq === null ? null : (sq * 100) / 1.15 / 8), 'piece'),
      line('tileScrews', 'Tile screws (box of 1,000)', 'field tiles × 1 ÷ 1,000', ceil(sq === null ? null : (sq * 90) / 1000), 'box'),
      line('birdStop', 'Eave bird stop', 'eaves × 1.05 ÷ 10 ft', ceil((eave * 1.05) / 10), 'piece'),
      line('valleyMetal', 'Tile valley metal', 'valleys × 1.1 ÷ 10 ft', ceil((valley * 1.1) / 10), 'piece'),
      line('pipeBoots', 'Lead pipe flashings', 'pipe vents marked on map', pipes, 'each'),
    ];
  }
  if (o.system === 'TPO_MEMBRANE') {
    const perim = eave + rake;
    return [
      line('tpoRolls', 'TPO 60-mil roll (10 ft × 100 ft = 10 sq)', 'roof squares × waste ÷ 10', ceil(sq === null ? null : sq / 10), 'roll'),
      line('polyiso', '2.0" polyiso board (4×8 = 32 ft²)', 'roof area × waste ÷ 32', ceil(sq === null ? null : (sq * 100) / 32), 'board'),
      line('plates', 'Plates & fasteners (box of 500)', 'boards × 8 ÷ 500', ceil(sq === null ? null : ((sq * 100) / 32) * 8 / 500), 'box'),
      line('bondingAdhesive', 'Bonding adhesive (5 gal ≈ 2 sq)', 'perimeter / flashing zones – estimate 30% of area ÷ 2', ceil(sq === null ? null : (sq * 0.3) / 2), 'pail'),
      line('edgeMetal', 'TPO-clad edge metal', 'roof perimeter (eaves + rakes) × 1.1 ÷ 10 ft', ceil((perim * 1.1) / 10), 'piece'),
      line('tpoFlashing', 'Wall flashing membrane (6 in × 100 ft)', '(wall + step flashing) × 1.1 ÷ 100 ft', ceil(((t.edgeFt.WALL_FLASHING + t.edgeFt.STEP_FLASHING) * 1.1) / 100), 'roll'),
      line('pipeBoots', 'Pre-molded pipe boots', 'pipe vents marked on map', pipes, 'each'),
    ];
  }
  return [
    line('metalPanels', '24ga standing seam panels', 'roof squares × waste', sq === null ? null : Math.round(sq * 10) / 10, 'sq'),
    line('ridgeTrim', 'Ridge / hip trim', '(ridges + hips) × 1.1 ÷ 10 ft', ceil(((ridge + hip) * 1.1) / 10), 'piece'),
    line('eaveTrim', 'Eave trim', 'eaves × 1.1 ÷ 10 ft', ceil((eave * 1.1) / 10), 'piece'),
    line('rakeTrim', 'Rake trim', 'rakes × 1.1 ÷ 10 ft', ceil((rake * 1.1) / 10), 'piece'),
    line('valleyMetal', 'Valley pan', 'valleys × 1.1 ÷ 10 ft', ceil((valley * 1.1) / 10), 'piece'),
    line('highTempUnderlayment', 'High-temp underlayment', 'roof squares × waste ÷ 2 sq/roll', ceil(sq === null ? null : sq / 2), 'roll'),
    line('clips', 'Panel clips (box of 250)', 'roof squares × waste × 50 clips/sq ÷ 250', ceil(sq === null ? null : (sq * 50) / 250), 'box'),
    line('pipeBoots', 'Pipe flashing boots', 'pipe vents marked on map', pipes, 'each'),
  ];
}

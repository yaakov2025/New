import { CATALOG_BY_ID, VENT_CATALOG } from "./catalog";
import { getHouseStyle } from "./house-styles";
import type {
  CalcResult,
  Finding,
  LineResult,
  Project,
  Suggestion,
  VentLine,
} from "./types";

export function atticAreaSqFt(project: Project): number {
  if (project.useTotalArea) return Math.max(0, project.totalSqFt);
  return Math.max(0, project.lengthFt * project.widthFt);
}

export function requiredTotalSqIn(areaSqFt: number, ratio: 150 | 300): number {
  if (areaSqFt <= 0) return 0;
  return (areaSqFt / ratio) * 144;
}

function nfaEach(line: VentLine): number {
  const product = CATALOG_BY_ID[line.productId];
  if (!product) return 0;
  if (line.nfaOverride != null && Number.isFinite(line.nfaOverride)) {
    return Math.max(0, line.nfaOverride);
  }
  return product.nfa;
}

function cfmEach(line: VentLine): number {
  const product = CATALOG_BY_ID[line.productId];
  if (!product || product.role !== "mechanical") return 0;
  if (line.cfmOverride != null && Number.isFinite(line.cfmOverride)) {
    return Math.max(0, line.cfmOverride);
  }
  return product.cfm ?? 0;
}

function lineResults(vents: VentLine[]): LineResult[] {
  const out: LineResult[] = [];
  for (const line of vents) {
    const product = CATALOG_BY_ID[line.productId];
    if (!product) continue;
    const qty = Math.max(0, line.quantity);
    const each = nfaEach(line);
    const cfm = cfmEach(line);
    out.push({
      line,
      product,
      nfaEach: each,
      nfaTotal: each * qty,
      cfmTotal: cfm * qty,
    });
  }
  return out;
}

export function climateAllows300(project: Project): { ok: boolean; detail: string } {
  if (project.climateZone >= 6 && !project.hasVaporRetarder) {
    return {
      ok: false,
      detail:
        "IRC R806.2 exception condition 1: in Climate Zones 6, 7, and 8 a Class I or II vapor retarder must be installed on the warm-in-winter side of the ceiling.",
    };
  }
  if (project.climateZone >= 6) {
    return {
      ok: true,
      detail:
        "Climate Zone 6–8 vapor-retarder condition is met. Placement must still be 40–50% high vents.",
    };
  }
  return {
    ok: true,
    detail:
      "Climate Zones 1–5: the vapor-retarder clause is not triggered. The 1/300 path still requires 40–50% of required NFA at the upper vents (within 3 ft of the ridge) and the balance in the bottom third.",
  };
}

function ceilTo(n: number, step = 1): number {
  if (n <= 0) return 0;
  return Math.ceil(n / step) * step;
}

function buildSuggestions(args: {
  project: Project;
  intakeShort: number;
  exhaustShort: number;
  ridgeUsedLf: number;
}): Suggestion[] {
  const { project, intakeShort, exhaustShort, ridgeUsedLf } = args;
  const suggestions: Suggestion[] = [];

  if (exhaustShort > 0.5) {
    const remainingRidge = Math.max(0, project.ridgeLengthFt - ridgeUsedLf);
    const ridgeNfa = 18;
    const lfNeeded = ceilTo(exhaustShort / ridgeNfa, 1);
    const lf = Math.min(lfNeeded, Math.floor(remainingRidge) || lfNeeded);
    if (remainingRidge >= 1 && project.roofType !== "shed") {
      const cover = Math.min(lf, remainingRidge) * ridgeNfa;
      suggestions.push({
        id: "add-ridge-18",
        productId: "ridge-18",
        quantity: Math.min(lf, Math.max(1, Math.floor(remainingRidge))),
        label: `Add ${Math.min(lf, Math.max(1, Math.floor(remainingRidge)))} lf of 18 NFA/lf ridge vent`,
        detail: `Covers about ${Math.round(cover)} sq in of exhaust. Available ridge ${formatFt(remainingRidge)}.`,
        covers: "exhaust",
      });
    }

    const still = Math.max(
      0,
      exhaustShort - (suggestions[0] ? Math.min(lfNeeded, remainingRidge) * ridgeNfa : 0),
    );
    if (still > 0.5 || remainingRidge < 1) {
      const units = Math.max(1, Math.ceil(still / 50));
      suggestions.push({
        id: "add-off-ridge",
        productId: "off-ridge",
        quantity: units,
        label: `Add ${units} off-ridge static vent${units === 1 ? "" : "s"} (50 NFA)`,
        detail:
          project.roofType === "hip"
            ? "Hip roofs often lack ridge length. Place off-ridge vents within 3 ft of the highest point."
            : "Use when ridge length is used up, or on hips and valleys.",
        covers: "exhaust",
      });
    }
  }

  if (intakeShort > 0.5) {
    const eave = Math.max(0, project.eaveLengthFt);
    const lfNeeded = Math.max(1, Math.ceil(intakeShort / 9));
    if (eave >= 1) {
      suggestions.push({
        id: "add-cont-soffit",
        productId: "cont-soffit",
        quantity: Math.min(lfNeeded, Math.max(1, Math.floor(eave))),
        label: `Add ${Math.min(lfNeeded, Math.max(1, Math.floor(eave)))} lf of continuous soffit (9 NFA/lf)`,
        detail: `Typical perforated soffit. Confirm the panel’s published NFA — some profiles are only 4–6 sq in/lf.`,
        covers: "intake",
      });
    }
    const pieces = Math.max(1, Math.ceil(intakeShort / 56));
    suggestions.push({
      id: "add-soffit-16x8",
      productId: "soffit-16x8",
      quantity: pieces,
      label: `Add ${pieces} of 16×8 in. soffit vent${pieces === 1 ? "" : "s"} (56 NFA)`,
      detail: "Most common individual under-eave vent. Keep insulation baffles open.",
      covers: "intake",
    });
    const drip = Math.max(1, Math.ceil(intakeShort / 9));
    suggestions.push({
      id: "add-drip",
      productId: "drip-edge",
      quantity: drip,
      label: `Or ${drip} lf of drip-edge / starter eave vent (9 NFA/lf)`,
      detail: "Works on homes with little or blocked soffit. Do not double-count with continuous soffit on the same eave.",
      covers: "intake",
    });
  }

  return suggestions;
}

function formatFt(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${r} ft`;
}

export function calculate(project: Project): CalcResult {
  const atticSqFt = atticAreaSqFt(project);
  const climate = climateAllows300(project);
  const lines = lineResults(project.vents);

  let providedIntakeSqIn = 0;
  let providedExhaustSqIn = 0;
  let fanCfm = 0;
  let ridgeUsedLf = 0;
  let hasRidge = false;
  let hasGable = false;
  let hasTurbine = false;
  let hasDome = false;
  let hasFan = false;
  let hasOffRidge = false;

  for (const row of lines) {
    if (row.product.role === "intake") providedIntakeSqIn += row.nfaTotal;
    if (row.product.role === "exhaust") providedExhaustSqIn += row.nfaTotal;
    if (row.product.role === "mechanical") {
      fanCfm += row.cfmTotal;
      hasFan = true;
    }
    if (row.product.mixGroup === "ridge") {
      hasRidge = true;
      ridgeUsedLf += row.line.quantity;
    }
    if (row.product.mixGroup === "gable") hasGable = true;
    if (row.product.mixGroup === "turbine") hasTurbine = true;
    if (row.product.mixGroup === "dome") hasDome = true;
    if (row.product.mixGroup === "offridge") hasOffRidge = true;
  }

  const providedTotalSqIn = providedIntakeSqIn + providedExhaustSqIn;
  const competingExhaust =
    [hasRidge, hasGable, hasTurbine, hasDome || hasOffRidge].filter(Boolean).length +
      (hasFan ? 1 : 0) >
    1;

  const want300 = project.targetMode === "code-300";
  const ratio: 150 | 300 = want300 ? 300 : 150;
  const requiredTotal = requiredTotalSqIn(atticSqFt, ratio);
  // Balanced split used for both 1/150 performance and warranty.
  // IRC 1/300: high vents 40–50% of *required*, balance in bottom third.
  const requiredIntakeSqIn =
    ratio === 300 ? requiredTotal * 0.55 : requiredTotal * 0.5;
  const requiredExhaustSqIn =
    ratio === 300 ? requiredTotal * 0.45 : requiredTotal * 0.5;
  const highMinSqIn = requiredTotal * 0.4;
  const highMaxSqIn = requiredTotal * 0.5;

  const highShareOfRequired =
    requiredTotal > 0 ? providedExhaustSqIn / requiredTotal : 0;

  const placementEligible300 =
    providedExhaustSqIn + 0.05 >= highMinSqIn &&
    providedExhaustSqIn <= highMaxSqIn + 0.05 &&
    providedIntakeSqIn + 0.05 >= requiredTotal - highMaxSqIn;

  const canClaim300 = climate.ok && placementEligible300 && providedTotalSqIn + 0.05 >= requiredTotalSqIn(atticSqFt, 300);

  const fanMakeupSqIn = fanCfm > 0 ? (fanCfm / 300) * 144 : 0;
  const intakeNeededForFans = Math.max(requiredIntakeSqIn, fanMakeupSqIn);
  const intakeVsMakeup = providedIntakeSqIn - intakeNeededForFans;

  const intakeDelta = providedIntakeSqIn - requiredIntakeSqIn;
  const exhaustDelta = providedExhaustSqIn - requiredExhaustSqIn;

  const codePass =
    atticSqFt > 0 &&
    (ratio === 150
      ? providedTotalSqIn + 0.05 >= requiredTotal
      : canClaim300);

  const warrantyRequired = requiredTotalSqIn(atticSqFt, 150);
  const warrantyPass =
    providedIntakeSqIn + 0.05 >= warrantyRequired * 0.5 &&
    providedExhaustSqIn + 0.05 >= warrantyRequired * 0.5;

  const meetsTarget =
    project.targetMode === "warranty" ? warrantyPass : codePass;

  const balanced =
    providedExhaustSqIn <= providedIntakeSqIn + 1 &&
    providedIntakeSqIn > 0 &&
    providedExhaustSqIn > 0;

  const findings: Finding[] = [];

  if (atticSqFt <= 0) {
    findings.push({
      id: "need-area",
      severity: "info",
      title: "Enter the attic floor area",
      detail: "Use length × width of the attic floor, or the total square footage. Code ratios are based on attic floor area, not roof area.",
    });
  }

  if (want300 && !climate.ok) {
    findings.push({
      id: "cz-block",
      severity: "fail",
      title: "1/300 exception not available in this climate without a vapor retarder",
      detail: climate.detail,
    });
  } else if (want300 && !placementEligible300) {
    findings.push({
      id: "place-300",
      severity: "fail",
      title: "Placement does not qualify for the 1/300 exception",
      detail: `IRC R806.2 requires 40–50% of the required NFA (${Math.round(highMinSqIn)}–${Math.round(highMaxSqIn)} sq in) in the upper attic within 3 ft of the ridge, and the balance in the bottom third. High vents currently provide ${Math.round(providedExhaustSqIn)} sq in (${Math.round(highShareOfRequired * 100)}% of required). Too much high venting disqualifies the exception — size extra exhaust against 1/150 instead.`,
    });
  }

  if (atticSqFt > 0 && codePass) {
    findings.push({
      id: "code-pass",
      severity: "ok",
      title:
        ratio === 300
          ? "Meets IRC R806.2 at 1/300 with balanced placement"
          : "Meets IRC R806.2 minimum at 1/150",
      detail:
        ratio === 300
          ? "Upper vents are in the 40–50% window and intake covers the balance. Confirm upper vents sit in the top 3 ft and soffits are in the bottom third."
          : "Total net free area is at least 1/150 of the attic floor. Splitting it 50/50 intake/exhaust is manufacturer best practice and is checked separately.",
    });
  } else if (atticSqFt > 0) {
    findings.push({
      id: "code-fail",
      severity: "fail",
      title: `Short of the ${ratio === 300 ? "1/300 exception" : "1/150"} net free area`,
      detail: `Need ${Math.round(requiredTotal)} sq in total NFA (${Math.round(requiredIntakeSqIn)} intake / ${Math.round(requiredExhaustSqIn)} exhaust). Provided ${Math.round(providedIntakeSqIn)} intake and ${Math.round(providedExhaustSqIn)} exhaust.`,
    });
  }

  if (atticSqFt > 0 && project.targetMode === "warranty") {
    if (warrantyPass) {
      findings.push({
        id: "warranty-pass",
        severity: "ok",
        title: "Meets ARMA / shingle-warranty 1/150 at 50/50",
        detail:
          "Asphalt Roofing Manufacturers Association sizing: attic sq ft ÷ 2 = sq in of intake NFA and the same of exhaust NFA. Many shingle warranties expect this even when the building code allows 1/300.",
      });
    } else {
      findings.push({
        id: "warranty-fail",
        severity: "fail",
        title: "Short of manufacturer 1/150 50/50 ventilation",
        detail: `Warranty target is ${Math.round(warrantyRequired * 0.5)} sq in intake and ${Math.round(warrantyRequired * 0.5)} sq in exhaust. Code can pass while a shingle warranty still requires more.`,
      });
    }
  } else if (atticSqFt > 0 && !warrantyPass) {
    findings.push({
      id: "warranty-note",
      severity: "warn",
      title: "Below typical shingle-warranty ventilation",
      detail:
        "Even if IRC 1/300 is legal here, most asphalt-shingle manufacturers want 1 sq ft NFA per 150 sq ft of attic, split evenly. Size to the warranty column if the roof is under warranty.",
    });
  }

  if (providedExhaustSqIn > providedIntakeSqIn + 8 && providedExhaustSqIn > 0) {
    findings.push({
      id: "neg-pressure",
      severity: "warn",
      title: "Exhaust exceeds intake — weather-ingestion risk",
      detail:
        "More exhaust than intake puts the attic under negative pressure. Ridge vents, turbines, and fans can pull rain or snow in. ARMA: if you cannot match them, prefer extra intake, never extra exhaust.",
    });
  }

  if (providedIntakeSqIn > 0 && providedExhaustSqIn === 0) {
    findings.push({
      id: "no-exhaust",
      severity: "fail",
      title: "No high exhaust vents",
      detail:
        "Cool air needs a way out at the ridge or upper third. Soffits alone cannot wash heat and moisture out of the attic.",
    });
  }

  if (providedExhaustSqIn > 0 && providedIntakeSqIn === 0) {
    findings.push({
      id: "no-intake",
      severity: "fail",
      title: "No low intake vents",
      detail:
        "Without soffit, eave, or drip-edge intake, exhaust vents draw from the living space or from themselves. This is the most common callback on ridge-vent jobs.",
    });
  }

  if (hasRidge && hasGable) {
    findings.push({
      id: "mix-ridge-gable",
      severity: "warn",
      title: "Ridge and gable vents compete",
      detail:
        "Air takes the shortest path. A gable opening next to ridge vent short-circuits the attic wash — the far bays stay hot and wet. Pick one exhaust strategy, or isolate attic zones. Manufacturer instructions for ridge vent almost always say: soffit intake only, no gables.",
    });
  }

  if (hasRidge && (hasTurbine || hasDome || hasOffRidge)) {
    findings.push({
      id: "mix-ridge-other",
      severity: "warn",
      title: "Ridge vent mixed with other roof exhaust",
      detail:
        "Turbines, domes, and off-ridge vents on the same attic compete with the ridge. They can stall sections of ridge vent or ingest weather. Best practice is one exhaust type per attic volume.",
    });
  }

  if (hasFan && (hasRidge || hasGable || hasTurbine || hasDome || hasOffRidge)) {
    findings.push({
      id: "mix-fan",
      severity: "fail",
      title: "Powered fan with other exhaust vents",
      detail:
        "Solar and electric attic fans pull hard. Other exhaust openings become inlets — rain, snow, and embers. Close or isolate ridge, gable, turbine, and dome vents if you run a fan, and size intake to the fan’s makeup-air requirement.",
    });
  }

  if (hasFan) {
    const hvi = atticSqFt * (project.darkOrSteepRoof ? 0.805 : 0.7);
    findings.push({
      id: "fan-info",
      severity: fanCfm + 1 >= hvi && intakeVsMakeup >= -1 ? "info" : "warn",
      title: `Mechanical exhaust ${Math.round(fanCfm)} CFM — makeup air ${Math.round(fanMakeupSqIn)} sq in`,
      detail: `HVI-style target is about ${Math.round(hvi)} CFM for this attic (${project.darkOrSteepRoof ? "0.805" : "0.7"} CFM per sq ft). Fans are not net free area under IRC R806 — they do not replace passive NFA unless the building official accepts mechanical ventilation. Provide at least 1 sq ft of intake NFA per 300 CFM (${Math.round(fanMakeupSqIn)} sq in).`,
    });
  }

  if (hasGable && !hasRidge && providedIntakeSqIn < requiredIntakeSqIn * 0.5) {
    findings.push({
      id: "gable-only",
      severity: "warn",
      title: "Gable-only ventilation",
      detail:
        "Two gables move air end-to-end, not eave-to-ridge. Eave bays can still ice-dam and cook shingles. Pair gables with soffit intake, or switch to a ridge + soffit system.",
    });
  }

  if (!project.bafflesInstalled && providedIntakeSqIn > 0) {
    findings.push({
      id: "baffles",
      severity: "info",
      title: "Keep soffit intake open with rafter baffles",
      detail:
        "Insulation that covers the soffit opening cancels the NFA you just counted. IRC expects the vents to actually communicate with the attic. Install baffles at every intake rafter bay.",
    });
  }

  if (project.roofType === "hip" && project.ridgeLengthFt < atticSqFt / 18 / 2 && !hasOffRidge && !hasDome && !hasFan) {
    findings.push({
      id: "hip-ridge",
      severity: "info",
      title: "Hip roofs often need off-ridge exhaust",
      detail:
        "A short main ridge cannot always carry the exhaust NFA. Place off-ridge or dome vents within 3 vertical feet of the highest point on each hip plane.",
    });
  }

  const style = getHouseStyle(project.houseStyle);

  if (style.id === "cape") {
    findings.push({
      id: "cape-ridge",
      severity: "info",
      title: "Cape Cod dormers break the ridge",
      detail:
        "Count only the continuous ridge you can slot. Knee-wall attics are still attic space under IRC R806 — ventilate the rafter bays, not just the center void.",
    });
  }

  if (style.id === "shed" || project.roofType === "shed") {
    findings.push({
      id: "shed-high",
      severity: "info",
      title: "Mono-slope exhaust sits at the high side",
      detail:
        "There is no ridge. Place off-ridge, dome, or a high-side vent within 3 ft of the high edge, and take intake at the low eave.",
    });
  }

  if (style.id === "hip" && hasGable) {
    findings.push({
      id: "hip-gable",
      severity: "warn",
      title: "Hip roofs do not have a gable wall",
      detail:
        "Gable louvers need a vertical gable. On a hip, use ridge, off-ridge, or roof-mounted static vents instead.",
    });
  }

  if (style.id === "craftsman") {
    findings.push({
      id: "craftsman-eave",
      severity: "info",
      title: "Deep Craftsman eaves help intake",
      detail:
        "Wide soffits take continuous vent well. Keep a porch roof from blocking the eave run you counted.",
    });
  }

  if (style.id === "colonial") {
    findings.push({
      id: "colonial-attic",
      severity: "info",
      title: "Colonial attic sits over the second floor",
      detail:
        "Size NFA to the attic floor area, not the whole house footprint × stories. Soffit intake still has to reach the eaves above the second-floor ceiling.",
    });
  }

  const suggestions = buildSuggestions({
    project,
    intakeShort: Math.max(0, requiredIntakeSqIn - providedIntakeSqIn),
    exhaustShort: Math.max(0, requiredExhaustSqIn - providedExhaustSqIn),
    ridgeUsedLf,
  });

  return {
    atticSqFt,
    ratio,
    requiredTotalSqIn: requiredTotal,
    requiredIntakeSqIn,
    requiredExhaustSqIn,
    highMinSqIn,
    highMaxSqIn,
    providedIntakeSqIn,
    providedExhaustSqIn,
    providedTotalSqIn,
    intakeDelta,
    exhaustDelta,
    highShareOfRequired,
    fanCfm,
    fanMakeupSqIn,
    intakeVsMakeup,
    climateEligible300: climate.ok,
    placementEligible300,
    canClaim300,
    codePass,
    warrantyPass,
    meetsTarget,
    balanced,
    lines,
    findings,
    suggestions,
    mix: {
      hasRidge,
      hasGable,
      hasTurbine,
      hasDome: hasDome || hasOffRidge,
      hasFan,
      competingExhaust,
    },
  };
}

export function newVentLine(productId: string, quantity = 1): VentLine {
  const product = CATALOG_BY_ID[productId] ?? VENT_CATALOG[0];
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    productId: product.id,
    quantity,
    nfaOverride: null,
    cfmOverride: null,
  };
}

export function defaultProject(): Project {
  return {
    name: "Ranch example",
    lengthFt: 50,
    widthFt: 30,
    useTotalArea: false,
    totalSqFt: 1500,
    climateZone: 3,
    hasVaporRetarder: false,
    targetMode: "warranty",
    roofType: "gable",
    houseStyle: "ranch",
    geometryCustom: false,
    ridgeLengthFt: 50,
    eaveLengthFt: 100,
    darkOrSteepRoof: false,
    bafflesInstalled: false,
    vents: [],
  };
}

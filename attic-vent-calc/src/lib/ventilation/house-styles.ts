import type { HouseStyleId, Project, RoofType } from "./types";

export interface HouseStyle {
  id: HouseStyleId;
  name: string;
  blurb: string;
  chip: string;
  tip: string;
  typicalRidge: string;
  typicalEave: string;
  note?: string;
  photo: string;
  drawing: string;
  hero: string;
  roofType: RoofType;
  steep: boolean;
  ridgeFt: (lengthFt: number, widthFt: number) => number;
  eaveFt: (lengthFt: number, widthFt: number) => number;
}

function roundFt(n: number) {
  return Math.max(0, Math.round(n));
}

export const HOUSE_STYLES: HouseStyle[] = [
  {
    id: "ranch",
    name: "Ranch",
    blurb: "One-story gable, long ridge, two eaves.",
    chip: "One-story gable",
    tip: "Long ridges take continuous ridge vent well. Keep both eaves open.",
    typicalRidge: "40–60 ft",
    typicalEave: "25–35 ft",
    photo: "/houses/ranch-photo.jpg",
    drawing: "/houses/ranch-drawing.jpg",
    hero: "/houses/ranch-hero.jpg",
    roofType: "gable",
    steep: false,
    ridgeFt: (L) => roundFt(L),
    eaveFt: (L) => roundFt(2 * L),
  },
  {
    id: "colonial",
    name: "Colonial",
    blurb: "Two-story gable, attic over the second floor.",
    chip: "Two-story gable",
    tip: "Size NFA to the attic floor, not the whole house times stories.",
    typicalRidge: "30–45 ft",
    typicalEave: "20–30 ft",
    photo: "/houses/colonial-photo.jpg",
    drawing: "/houses/colonial-drawing.jpg",
    hero: "/houses/colonial-hero.jpg",
    roofType: "gable",
    steep: true,
    ridgeFt: (L) => roundFt(L),
    eaveFt: (L) => roundFt(2 * L),
  },
  {
    id: "cape",
    name: "Cape Cod",
    blurb: "Steep 1½-story with dormers that break the ridge.",
    chip: "Steep 1½-story",
    tip: "Count only the continuous ridge you can slot. Knee walls still count as attic.",
    typicalRidge: "30–35 ft",
    typicalEave: "15–25 ft",
    photo: "/houses/cape-photo.jpg",
    drawing: "/houses/cape-drawing.jpg",
    hero: "/houses/cape-hero.jpg",
    roofType: "gable",
    steep: true,
    ridgeFt: (L) => roundFt(L * 0.7),
    eaveFt: (L) => roundFt(2 * L),
  },
  {
    id: "craftsman",
    name: "Craftsman",
    blurb: "Low pitch roof, deep eaves, often a porch.",
    chip: "Low pitch, deep eaves",
    tip: "Deep eaves keep rain out while bringing in cool air.",
    typicalRidge: "25–40 ft",
    typicalEave: "24–32 ft",
    photo: "/houses/craftsman-photo.jpg",
    drawing: "/houses/craftsman-drawing.jpg",
    hero: "/houses/craftsman-hero.jpg",
    roofType: "gable",
    steep: false,
    ridgeFt: (L) => roundFt(L),
    eaveFt: (L) => roundFt(2 * L * 1.08),
  },
  {
    id: "hip",
    name: "Hip",
    blurb: "Hips on all sides. Short ridge, four eaves.",
    chip: "Four-sided hip",
    tip: "No gable walls. Place exhaust at the short ridge or off-ridge near the peak.",
    typicalRidge: "10–25 ft",
    typicalEave: "20–32 ft",
    note: "No gable walls",
    photo: "/houses/hip-photo.jpg",
    drawing: "/houses/hip-drawing.jpg",
    hero: "/houses/hip-hero.jpg",
    roofType: "hip",
    steep: false,
    ridgeFt: (L, W) => roundFt(Math.max(8, L - W)),
    eaveFt: (L, W) => roundFt(2 * (L + W)),
  },
  {
    id: "shed",
    name: "Modern",
    blurb: "Mono-slope. Intake at the low eave, exhaust at the high side.",
    chip: "Mono-slope",
    tip: "There is no ridge. Exhaust at the high side, intake at the low eave.",
    typicalRidge: "No ridge",
    typicalEave: "30–50 ft",
    note: "High-side exhaust",
    photo: "/houses/shed-photo.jpg",
    drawing: "/houses/shed-drawing.jpg",
    hero: "/houses/shed-hero.jpg",
    roofType: "shed",
    steep: false,
    ridgeFt: () => 0,
    eaveFt: (L) => roundFt(L),
  },
];

export const HOUSE_STYLE_BY_ID: Record<HouseStyleId, HouseStyle> = Object.fromEntries(
  HOUSE_STYLES.map((s) => [s.id, s]),
) as Record<HouseStyleId, HouseStyle>;

export function getHouseStyle(id: HouseStyleId | undefined | null): HouseStyle {
  return HOUSE_STYLE_BY_ID[id ?? "ranch"] ?? HOUSE_STYLE_BY_ID.ranch;
}

export function isExampleName(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (!n) return true;
  if (n === "modern shed example") return true;
  return HOUSE_STYLES.some((s) => n === `${s.name} example`.toLowerCase());
}

export function applyHouseStylePatch(project: Project, partial: Partial<Project>): Project {
  const next: Project = { ...project, ...partial };
  const style = getHouseStyle(next.houseStyle);
  const styleChanged = partial.houseStyle != null && partial.houseStyle !== project.houseStyle;
  const sizeChanged = partial.lengthFt != null || partial.widthFt != null;

  if (partial.ridgeLengthFt != null || partial.eaveLengthFt != null) {
    next.geometryCustom = true;
  }

  if (styleChanged) {
    next.geometryCustom = false;
    next.roofType = style.roofType;
    next.darkOrSteepRoof = style.steep;
    next.ridgeLengthFt = style.ridgeFt(next.lengthFt, next.widthFt);
    next.eaveLengthFt = style.eaveFt(next.lengthFt, next.widthFt);
    if (isExampleName(project.name)) {
      next.name = `${style.name} example`;
    }
  } else if (sizeChanged && !next.geometryCustom) {
    next.ridgeLengthFt = style.ridgeFt(next.lengthFt, next.widthFt);
    next.eaveLengthFt = style.eaveFt(next.lengthFt, next.widthFt);
  }

  return next;
}

export interface DiagramOverlay {
  left: string | null;
  right: string | null;
  exit: string | null;
  chip: string;
  tip: string;
  exhaust: string;
  intakeLeft: string | null;
  intakeRight: string | null;
}

/** Paths in a 1600×900 viewBox, aligned to each hero illustration. */
export const DIAGRAM_OVERLAY: Record<HouseStyleId, DiagramOverlay> = {
  ranch: {
    left: "M 310 430 C 480 330, 640 240, 790 175",
    right: "M 1290 430 C 1120 330, 960 240, 810 175",
    exit: "M 800 170 L 800 70",
    chip: "left-3 top-3 sm:left-4 sm:top-4",
    tip: "right-3 top-3 sm:right-4 sm:top-4",
    exhaust: "left-1/2 top-[11%] -translate-x-1/2",
    intakeLeft: "bottom-[30%] left-[3%]",
    intakeRight: "bottom-[30%] right-[3%]",
  },
  colonial: {
    left: "M 430 300 C 560 220, 680 150, 790 95",
    right: "M 1170 300 C 1040 220, 920 150, 810 95",
    exit: "M 800 90 L 800 30",
    chip: "left-3 top-3 sm:left-4 sm:top-4",
    tip: "right-3 top-3 sm:right-4 sm:top-4",
    exhaust: "left-1/2 top-[6%] -translate-x-1/2",
    intakeLeft: "top-[34%] left-[4%]",
    intakeRight: "top-[34%] right-[4%]",
  },
  cape: {
    left: "M 236 322 L 345 80 L 775 80",
    right: "M 1364 322 L 1255 80 L 825 80",
    exit: "M 800 76 L 800 26",
    chip: "left-3 top-3 sm:left-4 sm:top-4",
    tip: "right-3 top-3 sm:right-4 sm:top-4",
    exhaust: "left-[38%] top-[2%]",
    intakeLeft: "bottom-[22%] left-[6%]",
    intakeRight: "bottom-[22%] right-[6%]",
  },
  craftsman: {
    left: "M 300 430 C 470 330, 640 240, 790 185",
    right: "M 1300 430 C 1130 330, 960 240, 810 185",
    exit: "M 800 180 L 800 70",
    chip: "left-3 top-3 sm:left-4 sm:top-4",
    tip: "right-3 top-3 sm:right-4 sm:top-4",
    exhaust: "left-1/2 top-[12%] -translate-x-1/2",
    intakeLeft: "bottom-[28%] left-[3%]",
    intakeRight: "bottom-[28%] right-[3%]",
  },
  hip: {
    left: "M 230 348 L 500 248 L 720 168 L 918 132",
    right: "M 1390 348 L 1180 248 L 1040 172 L 934 132",
    exit: "M 926 128 L 926 48",
    chip: "left-3 top-3 sm:left-4 sm:top-4",
    tip: "right-3 top-3 sm:right-4 sm:top-4",
    exhaust: "left-[58%] top-[4%]",
    intakeLeft: "bottom-[26%] left-[8%]",
    intakeRight: "bottom-[18%] right-[6%]",
  },
  shed: {
    left: null,
    right: "M 1280 500 C 980 390, 640 270, 400 185",
    exit: "M 390 175 L 300 80",
    chip: "left-3 top-3 sm:left-4 sm:top-4",
    tip: "right-3 top-3 sm:right-4 sm:top-4",
    exhaust: "left-[8%] top-[10%]",
    intakeLeft: null,
    intakeRight: "bottom-[22%] right-[6%]",
  },
};

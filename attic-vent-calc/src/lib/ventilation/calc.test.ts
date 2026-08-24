import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculate, defaultProject, newVentLine } from "./calc.ts";

describe("attic ventilation math", () => {
  it("sizes 1/150 at 50/50 for a 1500 sq ft attic", () => {
    const project = defaultProject();
    const result = calculate(project);
    assert.equal(result.atticSqFt, 1500);
    assert.equal(result.requiredTotalSqIn, 1440);
    assert.equal(result.requiredIntakeSqIn, 720);
    assert.equal(result.requiredExhaustSqIn, 720);
    assert.equal(result.meetsTarget, false);
  });

  it("passes warranty when ridge and soffit match 720", () => {
    const project = defaultProject();
    project.vents = [
      newVentLine("ridge-18", 40),
      newVentLine("soffit-16x8", 13),
    ];
    const result = calculate(project);
    assert.equal(result.providedExhaustSqIn, 720);
    assert.equal(result.providedIntakeSqIn, 728);
    assert.equal(result.warrantyPass, true);
    assert.equal(result.codePass, true);
    assert.equal(result.meetsTarget, true);
    assert.equal(result.balanced, true);
  });

  it("blocks 1/300 in climate zone 6 without a vapor retarder", () => {
    const project = defaultProject();
    project.targetMode = "code-300";
    project.climateZone = 6;
    project.hasVaporRetarder = false;
    project.vents = [
      newVentLine("ridge-18", 20),
      newVentLine("soffit-16x8", 7),
    ];
    const result = calculate(project);
    assert.equal(result.climateEligible300, false);
    assert.equal(result.canClaim300, false);
    assert.ok(result.findings.some((f) => f.id === "cz-block"));
  });

  it("warns when ridge and gable are mixed", () => {
    const project = defaultProject();
    project.vents = [
      newVentLine("ridge-18", 40),
      newVentLine("gable-18x24", 2),
      newVentLine("soffit-16x8", 13),
    ];
    const result = calculate(project);
    assert.ok(result.findings.some((f) => f.id === "mix-ridge-gable"));
  });

  it("notes Cape Cod dormers and hip gable mismatch", () => {
    const cape = defaultProject();
    cape.houseStyle = "cape";
    cape.roofType = "gable";
    assert.ok(calculate(cape).findings.some((f) => f.id === "cape-ridge"));

    const hip = defaultProject();
    hip.houseStyle = "hip";
    hip.roofType = "hip";
    hip.vents = [newVentLine("gable-18x24", 2)];
    const hipResult = calculate(hip);
    assert.ok(hipResult.findings.some((f) => f.id === "hip-gable"));
  });
});

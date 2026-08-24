import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultProject } from "./calc.ts";
import { applyHouseStylePatch, getHouseStyle } from "./house-styles.ts";

describe("house styles", () => {
  it("applies hip ridge and four-eave geometry", () => {
    const next = applyHouseStylePatch(defaultProject(), { houseStyle: "hip" });
    assert.equal(next.roofType, "hip");
    assert.equal(next.ridgeLengthFt, 20);
    assert.equal(next.eaveLengthFt, 160);
    assert.equal(next.name, "Hip example");
    assert.equal(next.geometryCustom, false);
  });

  it("zeros ridge on a shed and uses one eave", () => {
    const next = applyHouseStylePatch(defaultProject(), { houseStyle: "shed" });
    assert.equal(next.roofType, "shed");
    assert.equal(next.ridgeLengthFt, 0);
    assert.equal(next.eaveLengthFt, 50);
  });

  it("keeps a custom ridge when length changes", () => {
    const custom = applyHouseStylePatch(defaultProject(), { ridgeLengthFt: 12 });
    const next = applyHouseStylePatch(custom, { lengthFt: 60 });
    assert.equal(next.ridgeLengthFt, 12);
    assert.equal(next.geometryCustom, true);
  });

  it("updates eave with length while geometry is still locked", () => {
    const next = applyHouseStylePatch(defaultProject(), { lengthFt: 60 });
    assert.equal(next.ridgeLengthFt, 60);
    assert.equal(next.eaveLengthFt, 120);
  });

  it("falls back to ranch", () => {
    assert.equal(getHouseStyle(undefined).id, "ranch");
  });
});

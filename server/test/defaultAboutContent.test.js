import test from "node:test";
import assert from "node:assert/strict";
import { validateAboutInput } from "../src/routes/adminAbout.js";
import { defaultAboutSections } from "../src/services/defaultAboutContent.js";

test("starter About content validates without invented team or achievement claims", () => {
  const result = validateAboutInput({ sections: defaultAboutSections });
  assert.equal(result.error, undefined);
  assert.equal(result.value.find((section) => section.key === "introduction").visible, true);
  assert.equal(result.value.find((section) => section.key === "approach").steps.length, 4);
  assert.deepEqual(result.value.find((section) => section.key === "team").members, []);
  assert.deepEqual(result.value.find((section) => section.key === "achievements").achievements, []);
});

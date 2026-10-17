import test from "node:test";
import assert from "node:assert/strict";
import { validateAboutInput } from "../src/routes/adminAbout.js";

const sectionKeys = [
  "introduction",
  "missionVision",
  "approach",
  "team",
  "achievements",
  "cta",
];

function validAbout() {
  return {
    sections: sectionKeys.map((key, order) => ({
      key,
      order,
      visible: false,
      eyebrow: "",
      title: "",
      body: "",
      image: null,
      missionTitle: "",
      missionBody: "",
      visionTitle: "",
      visionBody: "",
      steps: [],
      members: [],
      achievements: [],
      buttonLabel: "",
      buttonHref: "",
    })),
  };
}

test("empty About page sections are valid and preserve the requested order", () => {
  const input = validAbout();
  input.sections.reverse().forEach((section, order) => { section.order = order; });
  const result = validateAboutInput(input);
  assert.equal(result.error, undefined);
  assert.deepEqual(result.value.map((section) => section.key), [...sectionKeys].reverse());
});

test("About section image references must belong to the About Cloudinary folder", () => {
  const input = validAbout();
  input.sections[0].image = {
    url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    publicId: "superx/portfolio/sample",
    alt: "",
  };
  assert.match(validateAboutInput(input).error, /About image folder/);
});

test("About CTA links reject unsafe protocols and unknown content", () => {
  const input = validAbout();
  input.sections.find((section) => section.key === "cta").buttonHref = "javascript:alert(1)";
  assert.match(validateAboutInput(input).error, /safe relative/);
  assert.match(validateAboutInput({ ...validAbout(), invented: "claim" }).error, /Unsupported About page field/);
});

test("team profiles require a name and bounded collection size", () => {
  const input = validAbout();
  input.sections.find((section) => section.key === "team").members = [{ name: " " }];
  assert.match(validateAboutInput(input).error, /non-empty string/);
  const tooMany = validAbout();
  tooMany.sections.find((section) => section.key === "achievements").achievements =
    Array.from({ length: 31 }, (_, index) => ({ label: `Verified item ${index}` }));
  assert.match(validateAboutInput(tooMany).error, /at most 30/);
});

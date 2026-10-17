import test from "node:test";
import assert from "node:assert/strict";
import { createRobotsText, createSitemapXml } from "../src/routes/discovery.js";

test("sitemap lists static pages and only supplied published content", () => {
  const xml = createSitemapXml("https://superx.example", {
    services: [{ slug: "web-development", updatedAt: new Date("2026-01-02T00:00:00Z") }],
    projects: [{ slug: "sample-project", updatedAt: new Date("2026-01-03T00:00:00Z") }],
    site: { legal: { privacyPolicy: "Policy", terms: "" } },
    about: {},
  });
  assert.match(xml, /https:\/\/superx\.example\/services\/web-development/);
  assert.match(xml, /https:\/\/superx\.example\/work\/sample-project/);
  assert.match(xml, /https:\/\/superx\.example\/privacy/);
  assert.doesNotMatch(xml, /https:\/\/superx\.example\/terms/);
  assert.match(xml, /<lastmod>2026-01-02T00:00:00\.000Z<\/lastmod>/);
});

test("robots sitemap URL is absolute and administrator pages are excluded", () => {
  const text = createRobotsText("https://superx.example");
  assert.match(text, /Disallow: \/admin/);
  assert.match(text, /Sitemap: https:\/\/superx\.example\/sitemap\.xml/);
});

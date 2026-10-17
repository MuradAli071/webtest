import test from "node:test";
import assert from "node:assert/strict";
import { applyFrontendMetadata } from "../src/frontend.js";

test("server-rendered page metadata includes canonical, social and crawler directives", () => {
  const html = applyFrontendMetadata(
    "<html><head><title>Old</title><meta name=\"description\" content=\"Old description\"><meta name=\"robots\" content=\"index, follow\"></head></html>",
    {
      title: "SUPERX & Company",
      description: "A page description.",
      siteName: "SUPERX Technology",
      imageUrl: "https://cdn.example/share.png",
      canonicalUrl: "https://superx.example/services/web-development",
      noIndex: true,
    },
  );
  assert.match(html, /<title>SUPERX &amp; Company<\/title>/);
  assert.match(html, /name="description" content="A page description\."/);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.match(html, /property="og:image" content="https:\/\/cdn\.example\/share\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /rel="canonical" href="https:\/\/superx\.example\/services\/web-development"/);
});

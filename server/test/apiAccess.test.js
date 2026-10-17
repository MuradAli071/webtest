import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import app from "../src/app.js";

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) return;
  server.close();
  await once(server, "close");
});

test("health endpoint reports the real disconnected database state", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", database: "disconnected" });
});

test("administrative content and private enquiries require an administrator session", async () => {
  for (const path of ["/api/admin/dashboard", "/api/admin/site", "/api/admin/enquiries", "/api/admin/projects"]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 401, path);
    assert.deepEqual(await response.json(), { error: "Administrator sign-in required." }, path);
    assert.equal(response.headers.get("cache-control"), "no-store", path);
  }
});

test("public enquiry endpoint validates before storing and does not expose a listing", async () => {
  const invalid = await fetch(`${baseUrl}/api/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Only name" }),
  });
  assert.equal(invalid.status, 400);
  assert.match((await invalid.json()).error, /email/);

  const listing = await fetch(`${baseUrl}/api/enquiries`);
  assert.equal(listing.status, 404);
  assert.deepEqual(await listing.json(), { error: "API endpoint not found." });
});

test("unknown legal types return a JSON 404", async () => {
  const response = await fetch(`${baseUrl}/api/site/legal/unknown`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Legal document not found." });
});

test("robots file excludes administrator pages and advertises the sitemap", async () => {
  const response = await fetch(`${baseUrl}/robots.txt`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/plain/);
  const body = await response.text();
  assert.match(body, /Disallow: \/admin/);
  assert.ok(body.includes(`Sitemap: ${baseUrl}/sitemap.xml`));
});

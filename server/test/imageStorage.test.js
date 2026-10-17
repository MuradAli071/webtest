import test from "node:test";
import assert from "node:assert/strict";
import { isValidImageBuffer } from "../src/services/imageStorage.js";

test("image uploads must match a supported image signature", () => {
  const samples = [
    [Buffer.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"],
    [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"],
    [Buffer.from("GIF89a"), "image/gif"],
    [Buffer.from("RIFF0000WEBP"), "image/webp"],
    [Buffer.from("0000ftypavif"), "image/avif"],
  ];
  for (const [buffer, mimeType] of samples) assert.equal(isValidImageBuffer(buffer, mimeType), true, mimeType);
  assert.equal(isValidImageBuffer(Buffer.from("<svg></svg>"), "image/png"), false);
  assert.equal(isValidImageBuffer(Buffer.from([0xff, 0xd8, 0xff]), "image/png"), false);
  assert.equal(isValidImageBuffer(Buffer.alloc(0), "image/jpeg"), false);
});

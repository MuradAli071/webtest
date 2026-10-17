import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const builtAssets = path.join(root, "frontend", "dist", "assets");
const publicAssets = path.join(root, "public", "assets");
const files = await readdir(builtAssets);

await rm(publicAssets, { recursive: true, force: true });
await mkdir(publicAssets, { recursive: true });
await cp(builtAssets, publicAssets, { recursive: true });

console.log(`Prepared ${files.length} Vite assets for Vercel.`);

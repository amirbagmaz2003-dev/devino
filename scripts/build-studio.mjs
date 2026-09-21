#!/usr/bin/env node
/**
 * Builds Sanity Studio into a static bundle for deployment as its own
 * Cloudflare Worker (kept separate from the main Next.js app's Worker —
 * see README, "Deploying Studio to Cloudflare Workers"). Purely local:
 * bundles the Studio app from sanity.config.ts + the schema types, no
 * network call to Sanity itself.
 *
 * Sanity's Studio builder is Vite-based and — like Next.js — defaults to
 * treating the project root's public/ folder as its own "copy verbatim
 * into the output" directory. Since this repo's public/ belongs to the
 * Next.js app (photos, logos), not Studio, anything `sanity build` copies
 * from there gets stripped back out afterwards; nothing in it is
 * referenced by Studio.
 *
 * Usage:
 *   NEXT_PUBLIC_SANITY_PROJECT_ID=<id> NEXT_PUBLIC_SANITY_DATASET=production \
 *   node scripts/build-studio.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(rootDir, "studio-dist");
const publicDir = path.join(rootDir, "public");

execFileSync("npx", ["sanity", "build", outDir, "-y"], {
  cwd: rootDir,
  stdio: "inherit",
});

const nextPublicEntries = new Set(fs.readdirSync(publicDir));
for (const entry of fs.readdirSync(outDir)) {
  if (nextPublicEntries.has(entry)) {
    fs.rmSync(path.join(outDir, entry), { recursive: true, force: true });
    console.log(`Stripped stray Next.js public/ asset from studio build: ${entry}`);
  }
}

console.log(`\nStudio static bundle ready at ${path.relative(rootDir, outDir)}/`);

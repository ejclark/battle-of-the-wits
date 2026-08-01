#!/usr/bin/env node
// harness-map — write the dungeon map to a self-contained HTML file.
//
//   harness-map                 # writes dungeon-map.html in the repo root
//   harness-map -o path.html    # writes somewhere else
//
// Standalone output: no external stylesheet, font, or script, so it opens from disk and renders
// under a strict CSP. A READ surface — regenerate any time; every element is derived from state.
import { writeFileSync } from "node:fs";
import { mapDocument } from "./cartography.mjs";
import { outPath, repoNameOf } from "./render.mjs";

const out = outPath(process.argv.slice(2), "dungeon-map.html");
const root = process.cwd();
const repoName = repoNameOf(root);

writeFileSync(out, mapDocument(root, repoName));
console.log(`✓ dungeon map written — ${out}`);

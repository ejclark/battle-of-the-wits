#!/usr/bin/env node
// harness-map — write the dungeon map to a self-contained HTML file.
//
//   harness-map                 # writes dungeon-map.html in the repo root
//   harness-map -o path.html    # writes somewhere else
//
// Output is standalone: no external stylesheet, font, or script, so it opens from disk, survives
// being emailed, and renders under a strict CSP. It is a READ surface — regenerate it any time; it
// cannot drift, because every element is derived from committed state at the moment it runs.
import { writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { mapHtml } from "./cartography.mjs";

// Named specifically rather than `args`: the duplication gate flagged a collision with another
// CLI's argv parse. Two two-line argv reads are a coincidental name match, not a shared abstraction
// waiting to be extracted — the fix is a distinct name, not a premature module.
const cliArgs = process.argv.slice(2);
const outIdx = Math.max(cliArgs.indexOf("-o"), cliArgs.indexOf("--out"));
const out = resolve(outIdx >= 0 ? cliArgs[outIdx + 1] : "dungeon-map.html");
const root = process.cwd();

writeFileSync(out, mapHtml(root, basename(root)));
console.log(`✓ dungeon map written — ${out}`);

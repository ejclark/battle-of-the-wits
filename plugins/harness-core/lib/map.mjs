#!/usr/bin/env node
// harness-map — write the dungeon map to a self-contained HTML file.
//
//   harness-map                 # writes dungeon-map.html in the repo root
//   harness-map -o path.html    # writes somewhere else
//
// Standalone output: no external stylesheet, font, or script, so it opens from disk and renders
// under a strict CSP. A READ surface — regenerate any time; every element is derived from state.
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, resolve } from "node:path";
import { mapDocument } from "./cartography.mjs";

// Named specifically rather than `args`: two two-line argv reads are a coincidental name match, not
// a shared abstraction waiting to be extracted.
const cliArgs = process.argv.slice(2);
const outIdx = Math.max(cliArgs.indexOf("-o"), cliArgs.indexOf("--out"));
const out = resolve(outIdx >= 0 ? cliArgs[outIdx + 1] : "dungeon-map.html");
const root = process.cwd();

// The REPOSITORY's name, not the checkout's directory name — a worktree is routinely called
// something like `repo-2`, and that in the title of a shared file reads as a different project.
let repoName = basename(root);
try {
  const url = execFileSync("git", ["remote", "get-url", "origin"], { cwd: root, encoding: "utf8" });
  repoName = basename(url.trim().replace(/\.git$/, ""));
} catch {
  /* no remote — the directory name is the best available answer */
}

writeFileSync(out, mapDocument(root, repoName));
console.log(`✓ dungeon map written — ${out}`);

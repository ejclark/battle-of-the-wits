#!/usr/bin/env node
// Duplication fitness scan — the eye of the "de-dupe" Coach (audit finding C2).
//
// Custom code that re-pastes the same helper/token block in file after file is how a codebase drifts:
// `escapeHtml` defined 3×, the design-token block copied across pages. This measures that debt as a
// single number — how many top-level symbols are DEFINED in more than one file — and enforces a
// committed BUDGET so new duplication can't land, while `--update` ratchets the budget DOWN as copies
// are consolidated into src/ui. Grandfathers today's duplication (frozen, not blocked) like arch-scan.
//
//   node scripts/dupe-scan.mjs            # report + enforce (exit 1 if duplication grew past budget)
//   node scripts/dupe-scan.mjs --update   # rewrite dupe-budget.json (ratchet: only lower)
//   node scripts/dupe-scan.mjs --candidate# emit the highest-leverage consolidation target as JSON
//
// Enforced in CI via tests/arch/dupe.spec.ts — runs on every PR, no extra workflow.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
// --- capability descriptor -------------------------------------------------
// The harness is repo-agnostic: every path it scans comes from harness.json at
// the target repo root, never from an assumption about layout. Missing file =
// the documented defaults, so a conventional repo needs no config at all.
const DESC = (() => {
  const d = { sourceDir: "src", testDir: "tests", specSuffix: ".spec.ts", sourceExt: ".ts", exclude: [] };
  try { Object.assign(d, JSON.parse(readFileSync(join(ROOT, "harness.json"), "utf8"))); } catch {}
  return d;
})();
const SRC = join(ROOT, DESC.sourceDir);
const BUDGET_FILE = join(ROOT, "dupe-budget.json");

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(DESC.sourceExt) && !e.name.endsWith(".d.ts")) acc.push(p);
  }
  return acc;
}
const rel = (f) => relative(ROOT, f).split("\\").join("/");

// Paths the repo declares are not first-party source — fixtures, generated output, and TEMPLATES.
// A template is source-shaped but is not this project's code; measuring it inflates every number and
// (worse) reports duplication between two deliberate variants of the same file as debt.
const EXCLUDED = (f) => (DESC.exclude ?? []).some((p) => rel(f).startsWith(p));

// Map each top-level definition name → the set of files that define it. A name defined in ≥2 files is
// duplication debt. We match top-level `function`/`const`/`class` declarations (exported or not).
// A same name in two files isn't *proof* of a pasted implementation — the drill judges that — but it's
// the cheap, high-recall signal. IGNORE holds conventional per-file names that are legitimately separate.
// Per-CLI entrypoint scaffolding, not shared code: nine standalone PATH executables each parse argv
// and resolve their own root because they must not import across that boundary. Renaming them one at
// a time was the gate distorting the codebase. Narrow on purpose — domain names (budget, DESC) stay
// caught.
const IGNORE = new Set(["main", "argv", "args", "ROOT"]);
const defRe = /^(?:export\s+)?(?:async\s+)?(?:function|const|class)\s+([A-Za-z_$][\w$]*)/gm;
const defs = new Map(); // name → Set(file)
for (const f of walk(SRC)) {
  if (EXCLUDED(f)) continue;
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(defRe)) {
    const name = m[1];
    if (IGNORE.has(name)) continue;
    if (!defs.has(name)) defs.set(name, new Set());
    defs.get(name).add(rel(f));
  }
}

// Duplicated symbols, most-copied first. Debt = Σ (copies − 1).
const dupes = [...defs.entries()]
  .filter(([, files]) => files.size > 1)
  .map(([name, files]) => ({ name, files: [...files].sort(), copies: files.size }))
  .sort((a, b) => b.copies - a.copies || a.name.localeCompare(b.name));
const debt = dupes.reduce((n, d) => n + (d.copies - 1), 0);

if (process.argv.includes("--candidate")) {
  // Highest leverage = the symbol pasted across the most files; consolidating it removes the most copies.
  console.log(
    JSON.stringify({ candidate: dupes[0] ?? null, runnerUp: dupes[1] ?? null, debt }, null, 2),
  );
  process.exit(0);
}

const budget = existsSync(BUDGET_FILE)
  ? JSON.parse(readFileSync(BUDGET_FILE, "utf8"))
  : { duplicateDefs: Number.POSITIVE_INFINITY };

if (process.argv.includes("--update")) {
  const prev = Number.isFinite(budget.duplicateDefs) ? budget.duplicateDefs : debt;
  const next = { duplicateDefs: Math.min(prev, debt) }; // ratchet down only
  writeFileSync(BUDGET_FILE, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`dupe-budget.json updated — duplicateDefs=${next.duplicateDefs} (only lowers).`);
  process.exit(0);
}

console.log("♊ Duplication scan — symbols defined in more than one file");
for (const d of dupes.slice(0, 10)) {
  console.log(`  ${String(d.copies).padStart(2)}×  ${d.name}`);
  for (const f of d.files) console.log(`        ${f}`);
}
console.log(`\n  duplication debt (Σ copies−1): ${debt}`);

const cap = budget.duplicateDefs;
if (debt > cap) {
  console.error(`\n✗ duplication grew: ${debt} > budget ${cap}.`);
  console.error(
    "Fix: promote the shared symbol into src/ui (or its natural home) and import it everywhere —\n" +
      "run /dedupe. Then `node scripts/dupe-scan.mjs --update` to ratchet the budget down.",
  );
  process.exit(1);
}
console.log(`\n✓ duplication within budget (${debt} ≤ ${cap}).`);

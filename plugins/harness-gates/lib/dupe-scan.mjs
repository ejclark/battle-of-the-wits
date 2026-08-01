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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { descriptor, isExcluded, isSourceName, readBudget, relTo, walkFiles, writeBudget } from "./descriptor.mjs";

const ROOT = process.cwd();
// Descriptor, budget I/O, tree walk and repo-relative paths come from descriptor.mjs — one
// behaviour, not six copies. A `bin/` launcher runs `node lib/<x>.mjs`, so a sibling import is an
// ordinary relative specifier; the "standalone executables must not import" rule was never true.
const DESC = descriptor(ROOT);
const SRC = join(ROOT, DESC.sourceDir);
const isSource = (n) => isSourceName(DESC, n);
const rel = (f) => relTo(ROOT, f);

// Map each top-level definition name → the set of files that define it. A name defined in ≥2 files is
// duplication debt. We match top-level `function`/`const`/`class` declarations (exported or not).
// A same name in two files isn't *proof* of a pasted implementation — the drill judges that — but it's
// the cheap, high-recall signal. IGNORE holds conventional per-file names that are legitimately separate:
// each standalone executable owns its own flags and its own root, so `argv`/`args`/`ROOT` recurring is
// scaffolding, not shared code. Renaming those one at a time was the gate distorting the codebase.
//
// This list USED to carry a second justification — that the executables "must not import across the
// PATH boundary" — which was false, and was defending the six copies of the descriptor preamble that
// descriptor.mjs now replaces. A duplication gate can be argued out of a finding as easily as into
// one, and the argument that wins is the one that sounds like architecture. Keep this narrow: domain
// names stay caught, and a rationale nobody has tested is not a rationale.
const IGNORE = new Set(["main", "argv", "args", "ROOT"]);
const defRe = /^(?:export\s+)?(?:async\s+)?(?:function|const|class)\s+([A-Za-z_$][\w$]*)/gm;
const defs = new Map(); // name → Set(file)
for (const f of walkFiles(SRC, isSource)) {
  if (isExcluded(DESC, rel(f))) continue;
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

const budget = readBudget(ROOT, "dupe", { duplicateDefs: Number.POSITIVE_INFINITY });

if (process.argv.includes("--update")) {
  const prev = Number.isFinite(budget.duplicateDefs) ? budget.duplicateDefs : debt;
  const next = { duplicateDefs: Math.min(prev, debt) }; // ratchet down only
  writeBudget(ROOT, "dupe", next);
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

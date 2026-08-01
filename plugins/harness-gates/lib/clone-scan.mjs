#!/usr/bin/env node
// Clone (copy-paste) fitness scan — the eye of the "clone" Coach (a new fitness dimension).
//
// dupe-scan catches the same top-level SYMBOL defined in more than one file (same-named helpers). It
// is blind to a pasted BLOCK whose identifiers were renamed — the classic "copy this loop, tweak the
// variable names" drift. jscpd (adopted; token-level copy-paste detector) sees those pasted bodies
// even when nothing shares a name. This wrapper is the CRAFTED part: one debt number (clone count)
// and a committed ratchet-down-only budget, same shape as arch-scan/dupe-scan/dead-scan. It
// COMPLEMENTS dupe-scan — different eye, different smell, same detect-and-correct loop (drill: /dedupe).
//
//   node scripts/clone-scan.mjs             # report + enforce (exit 1 if clones grew past budget)
//   node scripts/clone-scan.mjs --update    # rewrite clone-budget.json (ratchet: only lower)
//   node scripts/clone-scan.mjs --candidate # emit the biggest clone pair as JSON (two file:line locs)
//
// Enforced in CI via tests/arch/clone.spec.ts — runs on every PR, no extra workflow.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { descriptor, readBudget, writeBudget } from "./descriptor.mjs";

const ROOT = process.cwd();
// Descriptor, budget I/O, tree walk and repo-relative paths come from descriptor.mjs — one
// behaviour, not six copies. A `bin/` launcher runs `node lib/<x>.mjs`, so a sibling import is an
// ordinary relative specifier; the "standalone executables must not import" rule was never true.
const DESC = descriptor(ROOT);

// Run jscpd (config lives in .jscpd.json: scans src/, ignores specs, min-tokens 50). We own the
// verdict, so tolerate jscpd's own exit code and read its JSON report from a temp dir.
const outDir = mkdtempSync(join(tmpdir(), "jscpd-"));
try {
  execFileSync("npx", ["jscpd", "--silent", "--reporters", "json", "--output", outDir], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch {
  // jscpd exits non-zero when its own threshold trips — our budget is the real gate.
}
const report = JSON.parse(readFileSync(join(outDir, "jscpd-report.json"), "utf8"));

const total = report.statistics.total;
const debt = total.clones; // clone count = pasted block-pairs; the number we ratchet down
const duplicatedLines = total.duplicatedLines;
const percentage = total.percentage;

// Biggest clone pair first — most lines duplicated = the highest-leverage consolidation target.
const clones = [...report.duplicates].sort((a, b) => b.lines - a.lines);
const asPair = (d) =>
  d
    ? {
        lines: d.lines,
        tokens: d.tokens,
        a: `${d.firstFile.name}:${d.firstFile.start}-${d.firstFile.end}`,
        b: `${d.secondFile.name}:${d.secondFile.start}-${d.secondFile.end}`,
      }
    : null;

if (process.argv.includes("--candidate")) {
  console.log(
    JSON.stringify(
      { candidate: asPair(clones[0]), runnerUp: asPair(clones[1]), debt, duplicatedLines },
      null,
      2,
    ),
  );
  process.exit(0);
}

const budget = readBudget(ROOT, "clone", { clones: Number.POSITIVE_INFINITY });

if (process.argv.includes("--update")) {
  const prev = Number.isFinite(budget.clones) ? budget.clones : debt;
  const next = { clones: Math.min(prev, debt) }; // ratchet down only
  writeBudget(ROOT, "clone", next);
  console.log(`clone-budget.json updated — clones=${next.clones} (only lowers).`);
  process.exit(0);
}

console.log("⧉ Clone scan — pasted blocks (token-level, renamed identifiers included)");
for (const p of clones.slice(0, 10).map(asPair)) {
  console.log(`  ${String(p.lines).padStart(3)} lines  ${p.a}`);
  console.log(`             ↔  ${p.b}`);
}
console.log(
  `\n  clone debt (pairs): ${debt}   duplicated lines: ${duplicatedLines} (${percentage.toFixed(2)}%)`,
);

const cap = budget.clones;
if (debt > cap) {
  console.error(`\n✗ clones grew: ${debt} > budget ${cap}.`);
  console.error(
    "Fix: extract the pasted block into one shared function/module and call it from both sites —\n" +
      "run /dedupe (judgment: renamed-identifier clones may be coincidental). Then\n" +
      "`node scripts/clone-scan.mjs --update` to ratchet the budget down.",
  );
  process.exit(1);
}
console.log(`\n✓ clones within budget (${debt} ≤ ${cap}).`);

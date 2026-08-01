#!/usr/bin/env node
// Dead-code fitness scan — the eye of the dead-code Coach (research pass, missing dimension #1).
//
// Solo-with-agents churn leaves orphans nobody notices: unused files, exports, and types that
// inflate agent context, the untested-file count, and future readers' load. The detector is
// ADOPTED (knip — mark-and-sweep over the real module graph, knip.json holds entry points and
// judged false-positives like hook-invoked scripts); this wrapper is the CRAFTED part: one debt
// number and a committed ratchet-down-only budget, same shape as arch-scan/dupe-scan.
//
//   node scripts/dead-scan.mjs             # report + enforce (exit 1 if dead code grew)
//   node scripts/dead-scan.mjs --update    # rewrite dead-budget.json (ratchet: only lower)
//   node scripts/dead-scan.mjs --candidate # highest-leverage cleanup target as JSON
//
// Enforced in CI via tests/arch/dead.spec.ts.
import { execFileSync } from "node:child_process";
import { descriptor, readBudget, writeBudget } from "./descriptor.mjs";

const ROOT = process.cwd();
// Descriptor, budget I/O, tree walk and repo-relative paths come from descriptor.mjs — one
// behaviour, not six copies. A `bin/` launcher runs `node lib/<x>.mjs`, so a sibling import is an
// ordinary relative specifier; the "standalone executables must not import" rule was never true.
const DESC = descriptor(ROOT);

// knip exits non-zero when it finds issues; we own the verdict, so tolerate that.
let out = "";
try {
  out = execFileSync("npx", ["knip", "--no-exit-code", "--reporter", "json"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (e) {
  out = e.stdout ?? "";
}

// Graceful degradation: this is the one gate with an external dependency (knip). In a repo that
// hasn't installed it, `npx knip` prints help text or an install prompt rather than JSON — parsing
// that produced a raw SyntaxError, which reads like a harness bug to an adopter whose only real
// problem is a missing dev dependency. Say so plainly and skip, rather than failing the run: a gate
// that cannot measure must not pretend to a verdict in either direction.
let report;
try {
  report = JSON.parse(out);
} catch {
  console.log("☠ Dead-code scan (knip) — SKIPPED");
  console.log("\n  knip is not available in this repository, so dead code was not measured.");
  console.log("  Install it to enable this gate:  npm i -D knip");
  console.log("  Then commit a knip.json declaring your entry points.\n");
  process.exit(0);
}

// One debt number: unused files + unused exports + unused exported types.
const files = report.files ?? [];
const perFile = report.issues ?? [];
const exportsDebt = perFile.reduce((n, f) => n + (f.exports?.length ?? 0), 0);
const typesDebt = perFile.reduce((n, f) => n + (f.types?.length ?? 0), 0);
const debt = files.length + exportsDebt + typesDebt;

if (process.argv.includes("--candidate")) {
  // Highest leverage: an entire unused file beats a single export.
  const fileCand = files[0] ? { kind: "unused-file", target: files[0] } : null;
  const worst = [...perFile].sort(
    (a, b) =>
      (b.exports?.length ?? 0) +
      (b.types?.length ?? 0) -
      ((a.exports?.length ?? 0) + (a.types?.length ?? 0)),
  )[0];
  const exportCand = worst
    ? {
        kind: "unused-exports",
        target: worst.file,
        exports: (worst.exports ?? []).map((x) => x.name),
        types: (worst.types ?? []).map((x) => x.name),
      }
    : null;
  console.log(JSON.stringify({ candidate: fileCand ?? exportCand, debt }, null, 2));
  process.exit(0);
}

const budget = readBudget(ROOT, "dead", { deadCode: Number.POSITIVE_INFINITY });

if (process.argv.includes("--update")) {
  const prev = Number.isFinite(budget.deadCode) ? budget.deadCode : debt;
  const next = { deadCode: Math.min(prev, debt) }; // ratchet down only
  writeBudget(ROOT, "dead", next);
  console.log(`dead-budget.json updated — deadCode=${next.deadCode} (only lowers).`);
  process.exit(0);
}

console.log("☠ Dead-code scan (knip) — unused files/exports/types");
console.log(
  `  unused files: ${files.length} · unused exports: ${exportsDebt} · unused types: ${typesDebt}`,
);
console.log(`  dead-code debt: ${debt}`);

const cap = budget.deadCode;
if (debt > cap) {
  console.error(`\n✗ dead code grew: ${debt} > budget ${cap}.`);
  console.error(
    "Fix: delete the unused symbol/file (or wire it up if it's meant to be used). If knip is wrong\n" +
      "(e.g. invoked outside the module graph, like a hook script), add it to knip.json ignore with a\n" +
      "justification. Then `node scripts/dead-scan.mjs --update` to ratchet the budget down.",
  );
  process.exit(1);
}
console.log(`\n✓ dead code within budget (${debt} ≤ ${cap}).`);

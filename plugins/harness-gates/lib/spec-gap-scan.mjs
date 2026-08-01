#!/usr/bin/env node
// Spec-gap fitness scan — the eye of the coverage Coach (audit P3, adapted).
//
// Measures the finding directly rather than waiting on line coverage: HOW MANY source files are
// exercised by no spec at all. A file counts as tested when a spec imports it, or runs a launcher
// that execs it. The debt number is the count of untested files; the budget only ratchets DOWN.
//
//   harness-spec-gap-scan              # report + enforce (exit 1 if the gap grew)
//   harness-spec-gap-scan --update     # rewrite spec-gap-budget.json (ratchet: only lower)
//   harness-spec-gap-scan --candidate  # highest-leverage untested file as JSON
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { exercisedByExecution, launcherAliases } from "./references.mjs";

const ROOT = process.cwd();
// --- capability descriptor -------------------------------------------------
// Repo-agnostic: every path comes from harness.json at the target repo root, never from an
// assumption about layout. Missing file = the documented defaults, so a conventional repo needs none.
const DESC = (() => {
  const d = { sourceDir: "src", testDir: "tests", specSuffix: ".spec.ts", sourceExt: ".ts", exclude: [] };
  try { Object.assign(d, JSON.parse(readFileSync(join(ROOT, "harness.json"), "utf8"))); } catch {}
  return d;
})();
const BUDGET_FILE = join(ROOT, "spec-gap-budget.json");

function walk(dir, pred, acc = []) {
  // A repo may legitimately have no test tree yet — that is the *finding* (everything is a gap),
  // not a crash. Missing directories read as empty so a fresh adopter gets a report, not a stack.
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, pred, acc);
    else if (pred(e.name)) acc.push(p);
  }
  return acc;
}
const rel = (f) => relative(ROOT, f).split("\\").join("/");

// A file with no runtime behavior to spec: every export is a type/interface, so it compiles away
// like a .d.ts. Nothing to assert on — a "spec" would be vacuous or fabricate behavior.
const isTypeOnly = (f) => {
  const exports = readFileSync(join(ROOT, f), "utf8").match(/^export\s+\S+/gm) ?? [];
  return exports.length > 0 && exports.every((e) => /^export\s+(interface|type)\b/.test(e));
};

// Two descriptor axes, both defaulting to []:
//   · `specExempt` — first-party, but no honest unit assertion is available (WebGL/DOM render code,
//     CLI mains, fixture data). Which files those are is a property of the project, not the harness.
//     e.g. "specExempt": ["src/three/pieces/", "src/scripts/", "src/three/scene-main.ts"]
//   · `exclude` — not first-party source at all (templates, generated output). arch-scan and
//     dupe-scan already read it; this one did not, so it scored shipped TEMPLATES as untested code.
// Empty defaults are deliberate: an exemption the adopter did not ask for is a silently lowered bar.
const EXEMPT = DESC.specExempt ?? [];
const isExempt = (f) =>
  EXEMPT.some((p) => (p.endsWith("/") ? f.startsWith(p) : f === p)) ||
  (DESC.exclude ?? []).some((p) => f.startsWith(p));

// Every source module, minus files with no unit-testable behavior:
//   - descriptor exemptions (see above)
//   - type-only modules — interfaces/types that compile to nothing (see isTypeOnly)
const srcFiles = walk(join(ROOT, DESC.sourceDir), (n) => n.endsWith(DESC.sourceExt) && !n.endsWith(".d.ts"))
  .map(rel)
  .filter((f) => !isExempt(f))
  .filter((f) => !isTypeOnly(f));

// Which source files do specs exercise? Two relationships: a spec may `import` a module, or RUN a
// thin launcher that execs it (references.mjs). Imports alone scored this repo 24-of-24 untested.
const importRe = /from\s+["']([^"']+)["']/g;
const tested = new Set();
const SRC_PREFIX = `${DESC.sourceDir}/`;
const aliases = launcherAliases(ROOT, DESC.sourceDir);
for (const spec of walk(join(ROOT, DESC.testDir), (n) => n.endsWith(DESC.specSuffix))) {
  const body = readFileSync(spec, "utf8");
  for (const m of body.matchAll(importRe)) {
    if (!m[1].startsWith(".")) continue;
    // A spec may import "../lib/foo" (extensionless), "../lib/foo.js" (NodeNext), or the full path.
    const base = resolve(dirname(spec), m[1]).replace(/\.js$/, "");
    for (const candidate of [base + DESC.sourceExt, base]) {
      const r = rel(candidate);
      if (r.startsWith(SRC_PREFIX)) tested.add(r);
    }
  }
  for (const f of exercisedByExecution(body, aliases)) tested.add(f);
}

const lineCount = (f) => readFileSync(join(ROOT, f), "utf8").split("\n").length;
const untested = srcFiles
  .filter((f) => !tested.has(f))
  .map((f) => ({ file: f, lines: lineCount(f) }))
  .sort((a, b) => b.lines - a.lines);
const debt = untested.length;

if (process.argv.includes("--candidate")) {
  // Highest leverage = the biggest untested file (most unwatched behavior).
  console.log(
    JSON.stringify(
      { candidate: untested[0] ?? null, runnerUp: untested[1] ?? null, debt },
      null,
      2,
    ),
  );
  process.exit(0);
}

const budget = existsSync(BUDGET_FILE)
  ? JSON.parse(readFileSync(BUDGET_FILE, "utf8"))
  : { untestedFiles: Number.POSITIVE_INFINITY };

if (process.argv.includes("--update")) {
  const prev = Number.isFinite(budget.untestedFiles) ? budget.untestedFiles : debt;
  const next = { untestedFiles: Math.min(prev, debt) }; // ratchet down only
  writeFileSync(BUDGET_FILE, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`spec-gap-budget.json updated — untestedFiles=${next.untestedFiles} (only lowers).`);
  process.exit(0);
}

console.log("🧪 Spec-gap scan — src files no spec imports");
for (const u of untested.slice(0, 10)) console.log(`  ${String(u.lines).padStart(5)}  ${u.file}`);
if (debt > 10) console.log(`  … and ${debt - 10} more`);
console.log(`\n  untested files: ${debt} of ${srcFiles.length}`);

const cap = budget.untestedFiles;
if (debt > cap) {
  console.error(`\n✗ spec gap grew: ${debt} > budget ${cap}.`);
  console.error(
    "Fix: add a behavioral spec for the new/changed file (BDD — observable behavior, no\n" +
      "implementation peeking; see docs/ENGINEERING.md). Then `node scripts/spec-gap-scan.mjs --update`.",
  );
  process.exit(1);
}
console.log(`\n✓ spec gap within budget (${debt} ≤ ${cap}).`);

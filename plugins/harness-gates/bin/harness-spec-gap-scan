#!/usr/bin/env node
// Spec-gap fitness scan — the eye of the coverage Coach (audit P3, adapted).
//
// rstest v0.2 has no line-coverage support yet, so this measures the audit's actual finding
// directly: HOW MANY src files are exercised by no spec at all. A src file counts as tested when
// at least one tests/**/*.spec.ts imports it (directly). The debt number is the count of untested
// files; the committed budget only ever ratchets DOWN. When rstest ships real coverage, this eye
// upgrades to line-% without changing the coach's shape.
//
//   node scripts/spec-gap-scan.mjs             # report + enforce (exit 1 if the gap grew)
//   node scripts/spec-gap-scan.mjs --update    # rewrite spec-gap-budget.json (ratchet: only lower)
//   node scripts/spec-gap-scan.mjs --candidate # highest-leverage untested file as JSON
//
// Enforced in CI via tests/arch/spec-gap.spec.ts.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = process.cwd();
// --- capability descriptor -------------------------------------------------
// The harness is repo-agnostic: every path it scans comes from harness.json at
// the target repo root, never from an assumption about layout. Missing file =
// the documented defaults, so a conventional repo needs no config at all.
const DESC = (() => {
  const d = { sourceDir: "src", testDir: "tests", specSuffix: ".spec.ts", sourceExt: ".ts" };
  try { Object.assign(d, JSON.parse(readFileSync(join(ROOT, "harness.json"), "utf8"))); } catch {}
  return d;
})();
const BUDGET_FILE = join(ROOT, "spec-gap-budget.json");

function walk(dir, pred, acc = []) {
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

// WebGL/DOM-bound render code. These build meshes, materials and post-process pipelines against a
// live GPU context; there is no honest unit assertion to make about them without a browser, and a
// spec that only checked "a mesh was constructed" would be implementation-peeking theatre. They are
// verified instead by the screenshot harness (scripts/shoot-tower.mjs), which is the real contract.
// NOTE the deliberate split that makes this narrow: all the *decidable* logic (the tower profile
// curve, the seeded RNG, state→render params) lives in src/three/kit/{profile,rng,params}.ts, which
// are pure, excluded from this list, and fully specced in tests/three/kit.spec.ts.
const isWebglBound = (f) =>
  f.startsWith("src/three/pieces/") ||
  f === "src/three/scene-main.ts" ||
  ["src/three/kit/env.ts", "src/three/kit/materials.ts", "src/three/kit/greebles.ts"].includes(f);

// Every src module, minus files with no unit-testable behavior:
//   - src/scripts/*  — CLI mains, exercised by running, not import (like d.ts)
//   - src/evals/scenarios/*  — eval fixture DATA, exercised by the eval harness, not unit specs
//   - type-only modules  — interfaces/types that compile to nothing (see isTypeOnly)
//   - WebGL-bound render modules  — verified by screenshot (see isWebglBound)
const srcFiles = walk(join(ROOT, DESC.sourceDir), (n) => n.endsWith(".ts") && !n.endsWith(".d.ts"))
  .map(rel)
  .filter((f) => !f.startsWith("src/scripts/"))
  .filter((f) => !f.startsWith("src/evals/scenarios/"))
  .filter((f) => !isWebglBound(f))
  .filter((f) => !isTypeOnly(f));

// Which src files do specs import (directly)?
const importRe = /from\s+["']([^"']+)["']/g;
const tested = new Set();
for (const spec of walk(join(ROOT, DESC.testDir), (n) => n.endsWith(DESC.specSuffix))) {
  const body = readFileSync(spec, "utf8");
  for (const m of body.matchAll(importRe)) {
    if (!m[1].startsWith(".")) continue;
    const target = resolve(dirname(spec), m[1]).replace(/\.js$/, ".ts");
    const r = rel(target);
    if (r.startsWith("src/")) tested.add(r);
  }
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

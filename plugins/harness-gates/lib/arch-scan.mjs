#!/usr/bin/env node
// Architecture fitness scan — the executable version of the audit's god-file finding.
//
// A prose audit drifts; this doesn't. It measures every source file and enforces a committed
// per-file line BUDGET so god files can't grow and new ones can't appear — and every time a file
// shrinks, `--update` ratchets its budget DOWN (never up), so decomposition permanently tightens the
// limit. Grandfathers today's god files (frozen, not blocked) so there's no flag-day cleanup.
//
//   harness-arch-scan            # report + enforce (exit 1 on any over-budget file)
//   harness-arch-scan --update   # rewrite arch-budget.json (ratchet: budgets only lower)
//
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
// --- capability descriptor -------------------------------------------------
// Repo-agnostic: every path comes from harness.json at the target repo root, never from an
// assumption about layout. Missing file = the documented defaults, so a conventional repo needs none.
const DESC = (() => {
  const d = { sourceDir: "src", testDir: "tests", specSuffix: ".spec.ts", sourceExt: ".ts", exclude: [] };
  try { Object.assign(d, JSON.parse(readFileSync(join(ROOT, "harness.json"), "utf8"))); } catch {}
  return d;
})();
const SRC = join(ROOT, DESC.sourceDir);
const BUDGET_FILE = join(ROOT, "arch-budget.json");
const DEFAULT_CAP = 500; // a NEW file may not exceed this without an explicit budget entry
const WARN_AT = 300; // files above this are worth watching even if within budget

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(DESC.sourceExt) && !e.name.endsWith(".d.ts")) acc.push(p);
  }
  return acc;
}
const lineCount = (f) => readFileSync(f, "utf8").split("\n").length;
// A cheap cohesion proxy: how many distinct top-level things a file exports. Size says a file is
// big; exports say it's doing many jobs. A file that's big AND exports many unrelated symbols is a
// stronger split candidate than one big cohesive unit — this stops a decomposer from "passing" by
// shuffling lines into incoherent modules. (Graphify fan-in/community is the richer signal — ADR-0008
// §C — this is the self-contained stand-in until that's wired.)
const exportCount = (f) => {
  const src = readFileSync(f, "utf8");
  const decl = (
    src.match(/^export\s+(?:async\s+)?(?:function|const|class|interface|type|enum)\b/gm) || []
  ).length;
  const named = (src.match(/^export\s*\{/gm) || []).length;
  return decl + named;
};
const rel = (f) => relative(ROOT, f).split("\\").join("/");

// Paths the repo declares are not first-party source — fixtures, generated output, and TEMPLATES.
// A template is source-shaped but is not this project's code; measuring it inflates every number and
// (worse) reports duplication between two deliberate variants of the same file as debt.
const EXCLUDED = (f) => (DESC.exclude ?? []).some((p) => rel(f).startsWith(p));
const sortKeys = (o) =>
  Object.fromEntries(
    Object.keys(o)
      .sort()
      .map((k) => [k, o[k]]),
  );

const files = walk(SRC)
  .filter((f) => !EXCLUDED(f))
  .map((f) => ({ file: rel(f), lines: lineCount(f), exports: exportCount(f) }))
  .sort((a, b) => b.lines - a.lines);
const budget = existsSync(BUDGET_FILE) ? JSON.parse(readFileSync(BUDGET_FILE, "utf8")) : {};

// --candidate: emit the single highest-leverage split target as JSON for the decomposer agent.
// Score = how far over budget (or how far above the watch line) × a cohesion penalty for many
// exports. Detection is machine-readable so the loop needs no human to pick the next target.
if (process.argv.includes("--candidate")) {
  const scored = files
    .map((x) => {
      const cap = budget[x.file] ?? DEFAULT_CAP;
      const over = x.lines - cap; // >0 means violating; <0 means headroom
      const base = over > 0 ? over + 400 : Math.max(0, x.lines - WARN_AT);
      const score = Math.round(base * (1 + Math.max(0, x.exports - 1) * 0.15));
      return { ...x, cap, over, score, violating: over > 0 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const top = scored[0] ?? null;
  console.log(JSON.stringify({ candidate: top, runnerUp: scored[1] ?? null }, null, 2));
  process.exit(0);
}

if (process.argv.includes("--update")) {
  // `_`-prefixed keys are prose, not budgets: the justification for a deliberate raise. A rewrite
  // that drops them destroys the reasoning needed to judge whether the raise is still earned.
  const next = Object.fromEntries(Object.entries(budget).filter(([k]) => k.startsWith("_")));
  for (const { file, lines } of files) {
    const prev = budget[file];
    next[file] = prev !== undefined ? Math.min(prev, lines) : lines; // ratchet down only
  }
  writeFileSync(BUDGET_FILE, `${JSON.stringify(sortKeys(next), null, 2)}\n`);
  console.log(`arch-budget.json updated — ${Object.keys(next).length} files (budgets only lower).`);
  process.exit(0);
}

const violations = [];
for (const { file, lines } of files) {
  const cap = budget[file] ?? DEFAULT_CAP;
  if (lines > cap) violations.push({ file, lines, cap });
}

// Junk-drawer smell (docs/COACHES.md): a file named for what it ISN'T — utils/helpers/common/misc —
// has no cohesion story and becomes a dumping ground. Blocked outright for new files (none exist
// today, so there's nothing to grandfather). Name modules for the job they do.
// Extension comes from the descriptor: a junk drawer is a junk drawer in any language, and
// hardcoding .ts made this check silently inert outside a TypeScript repo.
const JUNK = new RegExp(
  `(?:^|/)(?:utils?|helpers?|common|misc|shared|stuff)\\${DESC.sourceExt}$`,
  "i",
);
const junk = files.filter((x) => JUNK.test(x.file));
if (junk.length) {
  console.error("\n✗ junk-drawer file name(s) — name modules for the job they do:");
  for (const j of junk) console.error(`  ${j.file}`);
  process.exit(1);
}

console.log("架 Architecture scan — largest source files");
for (const { file, lines } of files.slice(0, 8)) {
  const cap = budget[file] ?? DEFAULT_CAP;
  const mark = lines > cap ? "✗ OVER" : lines > WARN_AT ? "▲ watch" : "· ok";
  console.log(
    `  ${String(lines).padStart(5)}  (budget ${String(cap).padStart(5)})  ${mark}  ${file}`,
  );
}

if (violations.length) {
  console.error(`\n✗ ${violations.length} file(s) exceed their budget:`);
  for (const v of violations) console.error(`  ${v.file}: ${v.lines} > ${v.cap}`);
  console.error(
    "\nFix: decompose the file, or (only if the growth is justified) raise its arch-budget.json entry\n" +
      "in the same PR — a deliberate, reviewable act, never silent drift.",
  );
  process.exit(1);
}
console.log(`\n✓ all ${files.length} source files within budget.`);

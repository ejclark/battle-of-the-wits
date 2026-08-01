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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { descriptor, isExcluded, isSourceName, lineCount, readBudget, relTo, walkFiles, writeBudget } from "./descriptor.mjs";
import { append } from "./ledger.mjs";

const ROOT = process.cwd();
// Descriptor, budget I/O, tree walk and repo-relative paths come from descriptor.mjs — one
// behaviour, not six copies. A `bin/` launcher runs `node lib/<x>.mjs`, so a sibling import is an
// ordinary relative specifier; the "standalone executables must not import" rule was never true.
const DESC = descriptor(ROOT);
const SRC = join(ROOT, DESC.sourceDir);
const DEFAULT_CAP = 500; // a NEW file may not exceed this without an explicit budget entry
const WARN_AT = 300; // files above this are worth watching even if within budget

const isSource = (n) => isSourceName(DESC, n);
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
const rel = (f) => relTo(ROOT, f);

const files = walkFiles(SRC, isSource)
  .filter((f) => !isExcluded(DESC, rel(f)))
  .map((f) => ({ file: rel(f), lines: lineCount(f), exports: exportCount(f) }))
  .sort((a, b) => b.lines - a.lines);
const budget = readBudget(ROOT, "arch", {});

// --candidate: the highest-leverage split target as JSON for the decomposer. Score = how far over
// budget (or above the watch line) × a cohesion penalty for many exports.
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
  const debt = files.filter((x) => x.lines > (budget[x.file] ?? DEFAULT_CAP)).length;
  console.log(JSON.stringify({ candidate: top, runnerUp: scored[1] ?? null, debt }, null, 2));
  process.exit(0);
}

// ACCEPT A JUSTIFIED RAISE — the other half of the ratchet, and the half that was pure manual toil.
//
//   harness-arch-scan --accept "<why this growth is earned>"
//
// `--update` only ever lowers, correctly. But raises are legitimate — a module that RECEIVES a
// well-placed extraction grows, and the ratchet cannot tell that from someone piling on. The
// documented answer has always been "record it with reasoning", and the only way to do that was to
// hand-edit JSON. That happened four times in one session, twice with a scripted round-trip that had
// to be debugged. The doctrine on resource cost is explicit: a model-in-the-loop procedure costs
// every time, a script costs once.
//
// It is also STRICTLY SAFER than the hand-edit it replaces, which is the part worth noticing:
//   · a reason is REQUIRED, where the JSON file happily accepts a silent raise
//   · only files that are ACTUALLY over budget are raised, and only to their current size
//   · it cannot lower anything — the two directions stay separate commands and separate intentions
// Removing toil and adding a rail in the same change is the shape to look for; a convenience that
// weakens a gate is not a toil-killer, it is a bypass with better ergonomics.
if (process.argv.includes("--accept")) {
  const why = process.argv[process.argv.indexOf("--accept") + 1];
  const over = files.filter((x) => x.lines > (budget[x.file] ?? DEFAULT_CAP));

  if (!over.length) {
    console.error("Nothing is over budget — there is no raise to accept.");
    process.exit(2);
  }
  if (!why || why.startsWith("--") || why.trim().length < 40) {
    console.error(`✗ --accept needs a REASON, and "${why ?? ""}" is not one.\n`);
    console.error("  usage: harness-arch-scan --accept \"<why this growth is earned>\"\n");
    console.error("  Files that would be raised:");
    for (const { file, lines } of over) console.error(`    ${file}: ${budget[file] ?? DEFAULT_CAP} → ${lines}`);
    console.error(`
  Say what the module RECEIVED and why this is its right home, and say what must not be done to
  recover the lines. A future reader has to be able to judge whether the raise is still earned, and
  "refactor" tells them nothing — an unexplained raise is indistinguishable from giving up.
`);
    process.exit(2);
  }

  const next = { ...Object.fromEntries(Object.entries(budget).filter(([k]) => !k.startsWith("_"))) };
  for (const { file, lines } of over) next[file] = lines;
  const slug = why.toLowerCase().replace(/[^a-z0-9]+/g, "_").split("_").filter(Boolean).slice(0, 4).join("_");
  let key = `_why_${slug}`;
  for (let n = 2; budget[key] !== undefined; n++) key = `_why_${slug}_${n}`;
  writeBudget(ROOT, "arch", { ...next, [key]: `${over.map((o) => `${o.file} ${budget[o.file] ?? DEFAULT_CAP} → ${o.lines}`).join("; ")}. ${why}` }, { sort: true });

  // Recorded AS IT HAPPENS, which is the point: a retro that has to reconstruct the timeline
  // afterwards pays for the reconstruction every time, and can only ever see what survived.
  append(ROOT, "ratchet", { gate: "arch", direction: "up", files: over.length, delta: over.reduce((n, o) => n + (o.lines - (budget[o.file] ?? DEFAULT_CAP)), 0) });
  console.log(`✓ raised ${over.length} budget(s), recorded as ${key}:`);
  for (const { file, lines } of over) console.log(`    ${file}: ${budget[file] ?? DEFAULT_CAP} → ${lines}`);
  console.log("\n  This is a deliberate, reviewable act. It belongs in the same PR as the growth it accepts.");
  process.exit(0);
}

if (process.argv.includes("--update")) {
  const next = {};
  for (const { file, lines } of files) {
    const prev = budget[file];
    next[file] = prev !== undefined ? Math.min(prev, lines) : lines; // ratchet down only
  }
  const lowered = files.reduce((n, { file, lines }) => n + Math.max(0, (budget[file] ?? lines) - lines), 0);
  writeBudget(ROOT, "arch", next, { sort: true });
  if (lowered) append(ROOT, "ratchet", { gate: "arch", direction: "down", delta: lowered });
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

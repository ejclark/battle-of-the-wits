// THE SCANNERS' SHARED PREAMBLE — descriptor, budget file, tree walk, repo-relative path.
//
// Six scanners each carried their own copy of these four things: 32 duplicated definitions, the
// largest single block of duplication in this repository. The copies were not an accident. They were
// DEFENDED, in a comment in the duplication scanner itself:
//
//     "nine standalone PATH executables each parse argv and resolve their own root because they
//      must not import across that boundary"
//
// That belief is false, and it was already falsified in the same directory: `harness-claim` is
// launched from a `bin/` wrapper and imports `registry.mjs`, and has since the day it was written.
// A launcher runs `node lib/<x>.mjs`; from there a sibling import is an ordinary relative specifier.
// There is no boundary. There was a plausible-sounding reason nobody tested.
//
// Worth naming because a duplication gate can be argued *out* of a finding as easily as into one, and
// the argument that wins is the one that sounds like architecture. The distinction that matters:
//   · argv/ROOT parsing genuinely IS per-CLI scaffolding — each executable owns its own flags
//   · the descriptor, the budget file, and the tree walk are ONE behaviour, copied six times, and a
//     bug in any copy is a gate that measures the wrong thing while reporting a confident number
//
// The second kind is what this module ends. `spec-gap-scan` ignoring the `exclude` key that
// `arch-scan` and `dupe-scan` both honoured was exactly that bug, and it was invisible for months.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * The documented defaults — a conventional TypeScript repository needs no `harness.json` at all.
 * Kept here, once, so "what happens when a key is absent" has a single answer rather than six.
 */
const DEFAULTS = {
  sourceDir: "src",
  testDir: "tests",
  specSuffix: ".spec.ts",
  sourceExt: ".ts",
  specExempt: [],
  exclude: [],
};

/** The target repo's capability descriptor, merged over the defaults. Missing file = defaults. */
export function descriptor(root) {
  const d = { ...DEFAULTS };
  try {
    Object.assign(d, JSON.parse(readFileSync(join(root, "harness.json"), "utf8")));
  } catch {
    /* no descriptor is the common case, not an error */
  }
  return d;
}

/** Repo-relative, forward-slashed — the form every budget key and every report line uses. */
export const relTo = (root, f) => relative(root, f).split("\\").join("/");

/**
 * Every file under `dir` matching `pred(filename)`.
 *
 * A missing directory reads as empty rather than throwing: a repo with no test tree yet is the
 * *finding* (everything is a gap), and a scanner that crashes there fails at the one moment an
 * adopter is watching.
 */
export function walkFiles(dir, pred, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, pred, acc);
    else if (pred(e.name)) acc.push(p);
  }
  return acc;
}

/** Does this filename look like first-party source in the declared language? */
export const isSourceName = (desc, name) => name.endsWith(desc.sourceExt) && !name.endsWith(".d.ts");

/** Line count, the unit every size budget is denominated in. */
export const lineCount = (f) => readFileSync(f, "utf8").split("\n").length;

/** Paths the repo declares are not first-party source: fixtures, generated output, templates. */
export const isExcluded = (desc, relPath) => (desc.exclude ?? []).some((p) => relPath.startsWith(p));

/** A gate's committed budget, or `fallback` when the repo has never frozen one (grandfathering). */
export function readBudget(root, gate, fallback) {
  const file = join(root, `${gate}-budget.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback;
}

/**
 * Write a budget back.
 *
 * `_`-prefixed keys are prose, not numbers: the recorded justification for a deliberate raise. A
 * rewrite that drops them destroys the reasoning needed to judge whether the raise is still earned —
 * which it did, once, before this was centralised.
 */
export function writeBudget(root, gate, next, { sort = false } = {}) {
  const prior = readBudget(root, gate, {});
  const carried = Object.fromEntries(Object.entries(prior).filter(([k]) => k.startsWith("_")));
  const merged = { ...carried, ...next };
  const out = sort ? Object.fromEntries(Object.keys(merged).sort().map((k) => [k, merged[k]])) : merged;
  writeFileSync(join(root, `${gate}-budget.json`), `${JSON.stringify(out, null, 2)}\n`);
}

// Shared repo-state readers for the persona surfaces.
//
// Extracted because the duplication gate flagged `readJson` in two modules that — unlike the
// standalone scanners, which are separate PATH executables and must not import across that boundary
// — live in the same plugin and can simply share.
//
// Per the clamp/NaN lesson in the ledger, the two copies were DIFFED before consolidating rather
// than assumed identical: one took a path relative to a module-level ROOT, the other took the root
// explicitly. The explicit form is the general one, so it is what survives.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The six dimensions this harness measures — id, human label, the file that proves it is measured,
 * and the command that lights it if it is not.
 *
 * ONE TABLE, because two lists silently disagree. The ids and the labels used to be exactly that:
 * a `GATES` array here and a second, parallel list of `[budget, label, fix]` triples inside
 * `unlitDimensions` below, in the same order, with nothing keeping them in step. Nobody had to be
 * careless for those to drift — adding a seventh dimension to one and not the other is a one-line
 * omission that no test would have caught, and the symptom would have been a count of six against a
 * list of seven on two different surfaces.
 *
 * `evidence` is the file whose existence means the dimension is measured. For five of them that is
 * the committed budget; for incidents it is the lessons ledger, because a repository with nothing
 * written down is not learning, whatever else it has.
 */
export const DIMENSIONS = [
  { id: "arch", label: "file size", evidence: "arch-budget.json", fix: "harness-arch-scan --update" },
  { id: "dupe", label: "duplication", evidence: "dupe-budget.json", fix: "harness-dupe-scan --update" },
  { id: "dead", label: "dead code", evidence: "dead-budget.json", fix: "npm i -D knip, commit a knip.json, then harness-dead-scan --update" },
  { id: "spec-gap", label: "the spec gap", evidence: "spec-gap-budget.json", fix: "harness-spec-gap-scan --update" },
  { id: "clone", label: "copy-paste", evidence: "clone-budget.json", fix: "harness-clone-scan --update" },
  { id: "incident", label: "incidents", evidence: "docs/LESSONS.md", fix: "harness-bootstrap writes docs/LESSONS.md — nothing is learning today" },
];

/** The dimension ids, in order. Derived, so it cannot fall out of step with the table above. */
export const GATES = DIMENSIONS.map((d) => d.id);

/** Read a JSON file under `root`, or null. Budgets are routinely absent; that is data, not an error. */
export function readJson(root, path) {
  try {
    return JSON.parse(readFileSync(join(root, path), "utf8"));
  } catch {
    return null;
  }
}

/**
 * What one budget file totals, from its parsed contents.
 *
 * Two shapes are in the wild — a bare number (one debt total) and a map of file → budget — and every
 * surface that reads a budget has to handle both. Shared rather than copied because the history view
 * compares a budget against ITS OWN PAST: two readers that disagree about what a file totals would
 * render a change that never happened, which is worse than not drawing the line at all.
 *
 * `null` for anything unreadable, because "we could not measure this" is a state and it must never
 * arrive downstream as 0.
 */
export function budgetTotal(raw) {
  if (typeof raw === "number") return raw;
  if (raw === null || typeof raw !== "object") return null;
  return Object.entries(raw)
    .filter(([k, v]) => !k.startsWith("_why") && typeof v === "number")
    .reduce((sum, [, v]) => sum + v, 0);
}

/**
 * The canonical boss list — every standing target, derived from committed budgets.
 *
 * Extracted because three surfaces (the dungeon view, the forge, the map) each derived this from the
 * same budget files and drifted apart in shape while agreeing on substance. Diffed before merging,
 * per the clamp/NaN rule: they genuinely computed the same thing, so the shared function returns a
 * neutral record and each surface formats it. A surface deciding what a boss IS was the bug.
 *
 * Ordered biggest-first: the largest threat has to read first, on every surface.
 */
export function bossList(root) {
  const out = [];
  const arch = readJson(root, "arch-budget.json") ?? {};

  for (const [file, lines] of Object.entries(arch)
    .filter(([, v]) => typeof v === "number")
    .sort((a, b) => b[1] - a[1])) {
    out.push({ kind: "god-file", id: file, label: file.split("/").pop(), detail: file, stat: `${lines} lines`, weight: lines });
  }

  const dupe = readJson(root, "dupe-budget.json");
  if (dupe?.duplicateDefs > 0)
    out.push({
      kind: "duplication",
      id: "dupe",
      label: "The Hydra",
      detail: `${dupe.duplicateDefs} duplicated definitions`,
      stat: "dupe budget",
      weight: dupe.duplicateDefs * 6,
    });

  const gap = readJson(root, "spec-gap-budget.json");
  if (gap?.untested > 0)
    out.push({
      kind: "spec-gap",
      id: "spec-gap",
      label: "The Unwatched",
      detail: `${gap.untested} modules with no spec`,
      stat: "spec gap",
      weight: gap.untested * 4,
    });

  const clone = readJson(root, "clone-budget.json");
  if (clone?.clones > 0)
    out.push({
      kind: "clone",
      id: "clone",
      label: "The Echo",
      detail: `${clone.clones} copy-pasted blocks`,
      stat: "clone budget",
      weight: clone.clones * 3,
    });

  return out.sort((a, b) => b.weight - a.weight);
}

/**
 * Dimensions this repository cannot currently measure, each with the command that lights it.
 *
 * Shared because both the forge and the map derived it independently and would have drifted. An
 * unmeasured dimension must never render as a pass — silence here is the false-green the whole
 * harness exists to prevent — so the fix travels with the finding.
 */
export function unlitDimensions(root) {
  return DIMENSIONS.filter((d) => !existsSync(join(root, d.evidence))).map(({ label, fix }) => ({ label, fix }));
}

/**
 * Every dimension, each marked lit or unlit — what `unlitDimensions` reports, without discarding the
 * half that passed.
 *
 * The unlit half is what the map and the forge need, because a fix only travels with a finding. A
 * picture of *coverage* needs both halves: six dimensions with two dark is a different image from
 * two dimensions with two dark, and a list that only carries the failures cannot tell them apart.
 */
export function dimensionStanding(root) {
  return DIMENSIONS.map((d) => ({ ...d, lit: existsSync(join(root, d.evidence)) }));
}

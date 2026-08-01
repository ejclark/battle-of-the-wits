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

/** The six dimensions this harness measures. One list, because two lists silently disagree. */
export const GATES = ["arch", "dupe", "dead", "spec-gap", "clone", "incident"];

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
  const has = (p) => existsSync(join(root, p));
  const out = [];
  for (const [budget, label, fix] of [
    ["arch-budget.json", "file size", "harness-arch-scan --update"],
    ["dupe-budget.json", "duplication", "harness-dupe-scan --update"],
    ["dead-budget.json", "dead code", "npm i -D knip, commit a knip.json, then harness-dead-scan --update"],
    ["spec-gap-budget.json", "the spec gap", "harness-spec-gap-scan --update"],
    ["clone-budget.json", "copy-paste", "harness-clone-scan --update"],
  ]) {
    if (!has(budget)) out.push({ label, fix });
  }
  if (!has("docs/LESSONS.md")) {
    out.push({ label: "incidents", fix: "harness-bootstrap writes docs/LESSONS.md — nothing is learning today" });
  }
  return out;
}

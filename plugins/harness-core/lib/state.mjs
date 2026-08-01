// Shared repo-state readers for the persona surfaces.
//
// Extracted because the duplication gate flagged `readJson` in two modules that — unlike the
// standalone scanners, which are separate PATH executables and must not import across that boundary
// — live in the same plugin and can simply share.
//
// Per the clamp/NaN lesson in the ledger, the two copies were DIFFED before consolidating rather
// than assumed identical: one took a path relative to a module-level ROOT, the other took the root
// explicitly. The explicit form is the general one, so it is what survives.
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Read a JSON file under `root`, or null. Budgets are routinely absent; that is data, not an error. */
export function readJson(root, path) {
  try {
    return JSON.parse(readFileSync(join(root, path), "utf8"));
  } catch {
    return null;
  }
}

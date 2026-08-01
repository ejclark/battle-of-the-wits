// EXERCISED-BY-EXECUTION — the other half of "is this file tested?"
//
// The spec-gap gate originally answered that question one way only: does a spec `import` this
// source file? For a library that is the whole story. For a repository whose deliverable is a set
// of COMMANDS, it is close to a lie — this harness has 81 tests that drive its modules end to end
// by running them, and the gate scored every single file untested. A number that says 24 of 24
// when the truth is 0 of 24 is worse than no number: it makes the honest reading of every other
// gate suspect.
//
// So the gate learns the second relationship. A thin launcher — a script under a `bin/` directory
// whose body names a source file — is an ALIAS for that source. A spec that runs `harness-arch-scan`
// really does execute `lib/arch-scan.mjs`, and saying otherwise is a measurement bug.
//
// This is deliberately a general rule, not a special case for this repo: "a small executable that
// exec's one module" is a common shape, and the mapping is *derived from the launcher's own text*
// rather than declared in config. Nothing to keep in sync, nothing to forget.
//
// It is intentionally NOT a fuzzy heuristic. Only two things count:
//   · the launcher must exist under a directory literally named `bin`
//   · the path it names must resolve to a real file inside the source tree
// A launcher that shells out to something else contributes no aliases, and a spec that merely
// mentions a word contributes nothing unless that word is a launcher's filename.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/** Every directory named `bin` at any depth under `dir`. */
function binDirs(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const p = join(dir, e.name);
    if (e.name === "bin") acc.push(p);
    else binDirs(p, acc);
  }
  return acc;
}

/**
 * Map each launcher's filename to the source files it executes.
 *
 * @param {string} root       repository root
 * @param {string} sourceDir  the descriptor's `sourceDir`, relative to root
 * @returns {Map<string, string[]>} launcher basename → repo-relative source paths
 */
export function launcherAliases(root, sourceDir) {
  const aliases = new Map();
  for (const dir of binDirs(join(root, sourceDir))) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isFile()) continue;
      let body;
      try {
        body = readFileSync(join(dir, e.name), "utf8");
      } catch {
        continue; // unreadable is not a mapping
      }
      const targets = new Set();
      // Any path-shaped token ending in a module extension. Where it is anchored (an env var, a
      // resolved $DIR, a bare relative path) does not matter — only whether the tail resolves.
      for (const m of body.matchAll(/[\w$.{}/-]+\.[cm]?js\b/g)) {
        const tail = m[0].replace(/^.*?([\w-]+\/[\w./-]+)$/, "$1");
        for (const base of [dir, join(dir, "..")]) {
          const p = resolve(base, tail);
          if (!existsSync(p) || !statSync(p).isFile()) continue;
          const r = relative(root, p).split("\\").join("/");
          if (r.startsWith(`${sourceDir}/`)) targets.add(r);
        }
      }
      if (targets.size) aliases.set(e.name, [...targets]);
    }
  }
  return aliases;
}

/**
 * Which sources a spec exercises by running a launcher.
 *
 * Matched on a word boundary so `harness-arch-scan` in a spec counts and `harness-arch-scanner`
 * does not — a near-miss name is a different command, and crediting it would quietly re-open the
 * hole this closes.
 */
export function exercisedByExecution(specText, aliases) {
  const hit = new Set();
  for (const [name, sources] of aliases) {
    if (new RegExp(`(^|[^\\w-])${name}([^\\w-]|$)`).test(specText)) {
      for (const s of sources) hit.add(s);
    }
  }
  return hit;
}

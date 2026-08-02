#!/usr/bin/env node
// IMPORT A REAL REPOSITORY, TO FIND OUT WHETHER ANY OF THIS ACTUALLY TRAVELS.
//
//   harness-import <url-or-path> [--branch NAME] [--where] [--dry-run]
//
// The README calls portability a claim on purpose: this has been proven in exactly one codebase, and
// the honest test is a repository that did not grow here. Every cold-start defect so far — the
// hardcoded `src/` prefix, the descriptor claiming TypeScript in a JavaScript repo, `command -v` on
// Windows — was found by running against something shaped differently, and none of them was
// findable by reading.
//
// THIS ONLY CLONES. It does not adopt, does not write, does not run a scanner. Two reasons, and the
// second is the real one: a command that clones AND adopts cannot tell you which half failed, and
// "the harness broke my repo" versus "the clone failed" is exactly the distinction an adopter needs
// in their first five minutes. The next step is printed rather than performed.
//
// EVERYTHING LANDS IN `.harness/workspace/<repo>/<branch>`, inside this checkout and nowhere else.
// That is contained on purpose — see workspace.mjs for the trade and for the three hazards it buys,
// each of which has a countermeasure with a test on it.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { HARNESS_ROOT, WORKSPACE, assertContained, isImported, pathFor, workspaceRoot } from "./workspace.mjs";

const HARNESS = HARNESS_ROOT;

/** The repository's name, from a URL or a local path. `.git` suffix and trailing slashes removed. */
export function nameOf(source) {
  const trimmed = String(source).replace(/[/\\]+$/, "");
  const last = trimmed.split(/[/\\]/).pop() ?? "";
  return last.replace(/\.git$/i, "") || "repo";
}

/**
 * Clone `source` at `branch` into the workspace.
 *
 * A repo already imported is NOT re-cloned and not silently updated either. Both would be surprises:
 * the first throws away work somebody may have in there, and the second changes a checkout under a
 * session that thinks it knows what it is looking at.
 */
export function importRepo(source, { branch = "main", harnessRoot = HARNESS, run = defaultRun } = {}) {
  const dir = pathFor(nameOf(source), branch, { harnessRoot });
  assertContained(dir, harnessRoot);

  if (isImported(dir)) return { dir, cloned: false, reason: "already imported" };

  mkdirSync(dirname(dir), { recursive: true });
  // --branch fails loudly on a branch that does not exist, which is the correct outcome: silently
  // cloning the default branch instead would hand somebody a checkout of code they did not ask for
  // and let them draw conclusions from it.
  run("git", ["clone", "--branch", branch, "--single-branch", String(source), dir]);
  return { dir, cloned: true };
}

function defaultRun(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

// ── CLI ────────────────────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith("import-repo.mjs")) {
  const argv = process.argv.slice(2);
  const at = (flag) => (argv.indexOf(flag) >= 0 ? argv[argv.indexOf(flag) + 1] : null);
  const source = argv.find((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1] !== "--branch");
  const branch = at("--branch") ?? "main";

  if (argv.includes("--where")) {
    console.log(workspaceRoot());
    process.exit(0);
  }
  if (!source) {
    console.log("\n  harness-import <url-or-path> [--branch NAME] [--where] [--dry-run]\n");
    console.log(`  Workspace: ${workspaceRoot()}`);
    console.log(`  Always ${WORKSPACE}/<repo>/<branch>, inside this checkout — gitignored and excluded`);
    console.log("  from every gate, so an imported repository's debt is never reported as ours.\n");
    process.exit(argv.length ? 1 : 0);
  }

  const target = pathFor(nameOf(source), branch);
  if (argv.includes("--dry-run")) {
    console.log(`\n  would clone ${source} (${branch})\n  into ${target}\n`);
    process.exit(0);
  }

  try {
    const { dir, cloned, reason } = importRepo(source, { branch });
    console.log(`\n  ${cloned ? "✓ imported" : `· ${reason}`}  ${nameOf(source)} (${branch})`);
    console.log(`      ${dir}\n`);
    // The next step, printed rather than performed — see the header. The adoption is the experiment;
    // running it automatically would merge "the clone worked" and "the harness works there" into one
    // outcome, and the whole point of this exercise is telling those two apart.
    console.log("  Adopt the harness into it, and watch what breaks:\n");
    console.log(`      cd ${dir}`);
    console.log(`      node ${join(HARNESS, "plugins/harness-core/lib/bootstrap.mjs")} --auto\n`);
    console.log("  What goes wrong there is the finding. A defect that only appears in a repository");
    console.log("  shaped differently from this one is the only kind this project cannot find alone.\n");
  } catch (err) {
    console.error(`\n  ✗ ${err.message}\n`);
    process.exit(1);
  }
}

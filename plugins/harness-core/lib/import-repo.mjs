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
import { forkRepo } from "./github.mjs";
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

/**
 * Fork `owner/repo`, then import THE FORK — with `upstream` pointing back at the source.
 *
 * The collaboration path for a repository the runner cannot push to: the fork is the new GitHub
 * project, branches land on it, and PRs flow from fork to source. The upstream remote is added so
 * the checkout can track the real repository's movement; nothing here fetches or merges it —
 * keeping a fork current is work with a judgement in it, and it stays with whoever is working.
 *
 * THE CLONE RETRIES, THE API IS NEVER POLLED. GitHub answers a fork request before the fork is
 * fully materialised, so the first clone can meet an empty repository. The clone is the thing
 * actually being waited on and it fails cheaply, so it is what retries — three attempts, short
 * fixed waits, then an honest error naming the fork so the human can simply re-run.
 */
export async function forkAndImport(ownerRepo, { branch, harnessRoot = HARNESS, run = defaultRun, fork = forkRepo, sleep = defaultSleep } = {}) {
  const [owner, repo] = String(ownerRepo).split("/");
  if (!owner || !repo) throw new Error(`expected owner/repo, got "${ownerRepo}"`);

  const made = await fork(owner, repo);
  const want = branch ?? made.defaultBranch;
  const dir = pathFor(nameOf(made.fullName), want, { harnessRoot });
  assertContained(dir, harnessRoot);
  if (isImported(dir)) return { dir, fullName: made.fullName, cloned: false, reason: "already imported" };

  mkdirSync(dirname(dir), { recursive: true });
  let lastErr;
  for (const wait of [0, 2000, 5000]) {
    if (wait) await sleep(wait);
    try {
      run("git", ["clone", "--branch", want, "--single-branch", made.cloneUrl, dir]);
      run("git", ["-C", dir, "remote", "add", "upstream", `https://github.com/${owner}/${repo}.git`]);
      return { dir, fullName: made.fullName, cloned: true };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`the fork ${made.fullName} exists but could not be cloned after 3 attempts — re-run in a moment.\n  ${lastErr?.message ?? ""}`);
}

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    console.log("\n  harness-import <url-or-path> [--branch NAME] [--where] [--dry-run]");
    console.log("  harness-import --fork <owner/repo> [--branch NAME]   # fork first, import the fork\n");
    console.log(`  Workspace: ${workspaceRoot()}`);
    console.log(`  Always ${WORKSPACE}/<repo>/<branch>, inside this checkout — gitignored and excluded`);
    console.log("  from every gate, so an imported repository's debt is never reported as ours.\n");
    console.log("  --fork is the collaboration path for a repository you cannot push to: the fork is");
    console.log("  the project your branches land on, `upstream` points at the source, and PRs flow");
    console.log("  fork → source. Needs GH_TOKEN/GITHUB_TOKEN — the harness carries no credential.\n");
    process.exit(argv.length ? 1 : 0);
  }

  if (argv.includes("--fork")) {
    try {
      const { dir, fullName, cloned, reason } = await forkAndImport(source, { branch: at("--branch") ?? undefined });
      console.log(`\n  ${cloned ? "✓ forked and imported" : `· ${reason}`}  ${fullName}`);
      console.log(`      ${dir}`);
      console.log(`      origin → your fork · upstream → ${source}\n`);
      console.log("  Branch there, push to origin, and open the PR against upstream:\n");
      console.log(`      cd ${dir}`);
      console.log(`      git switch -c <branch> && …work… && git push -u origin <branch>\n`);
    } catch (err) {
      console.error(`\n  ✗ ${err.message}\n`);
      process.exit(1);
    }
    process.exit(0);
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

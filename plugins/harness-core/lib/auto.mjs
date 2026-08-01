// THE AUTOMATED ADOPTION RUN — the one-shot actually taking one shot.
//
// `harness-bootstrap` wrote the files and then handed back a five-step checklist: install, freeze
// five budgets, verify, commit, ship. Every one of those is mechanical, so leaving them to a human
// was the tool stopping halfway and calling it done. This runs the sequence.
//
// WHAT IT DELIBERATELY DOES NOT DO: push, or open a pull request. That is not squeamishness about
// automation — it is that everything above this line is local and reversible (delete the files, `git
// reset`), while a push is outward-facing and lands in someone's repository. A bootstrap other people
// run on their own projects must not do that by default. `--ship` opts in.
//
// The genuinely human step is narrower still and cannot be automated from here at all: branch
// protection, auto-merge, and the GitHub App grant need repo-admin credentials. The run ends by
// naming them exactly, because a handover that says "configure your repo" is not a handover.
import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Named for what it is rather than `HERE`, which collided with the same one-liner in bootstrap.mjs.
// Two modules each resolving their own directory is a coincidental name match, not a shared
// abstraction waiting to be extracted — the fix is a distinct name, not a module.
const THIS_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Find a harness executable. On PATH when the plugin is installed; a sibling directory when running
 * from a checkout. Resolving both means the run works before and after installation, which matters
 * because the first thing anyone does is try it from a clone.
 */
function resolveTool(name) {
  const sibling = join(THIS_DIR, "../../harness-gates/bin", name);
  if (existsSync(sibling)) return sibling;
  try {
    return execSync(`command -v ${name}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {
    return null;
  }
}

const GATES = ["arch", "dupe", "dead", "spec-gap", "clone", "incident"];

/** Run a step, capturing rather than inheriting output — the log is the report, not a scrollback. */
function step(label, fn) {
  try {
    const detail = fn();
    console.log(`  ✓ ${label}${detail ? `  —  ${detail}` : ""}`);
    return true;
  } catch (err) {
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}`.trim();
    console.log(`  ✗ ${label}`);
    if (out) console.log(out.split("\n").slice(-6).map((l) => `      ${l}`).join("\n"));
    return false;
  }
}

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

export function autoAdopt(root, { ship = false } = {}) {
  console.log("\n⚙  Automated adoption run\n");

  // 1 — dependencies. Everything below needs the tools to exist, and husky's `prepare` builds the
  // hook runner here, so hooks written by the bootstrap are inert until this completes.
  const hasPkg = existsSync(join(root, "package.json"));
  if (hasPkg) {
    step("install dependencies", () => {
      run("npm", ["install", "--no-audit", "--no-fund"], root);
      return "npm install";
    });
  } else {
    console.log("  · no package.json — skipping install (nothing to install)");
  }

  // 2 — THE GRANDFATHER STEP. Freeze today's debt so the gates block growth only. Skipping this is
  // how adoption fails: the first PR goes red for pre-existing debt nobody caused, the gates get
  // switched off, and they never come back on.
  const frozen = [];
  const unavailable = [];
  for (const gate of GATES) {
    const tool = resolveTool(`harness-${gate}-scan`);
    if (!tool) {
      unavailable.push(gate);
      continue;
    }
    // A gate that cannot measure (knip absent, no test tree) must not fail the run — it reports and
    // exits clean, and its budget simply is not written. That dimension stays honestly unlit.
    const ok = step(`freeze ${gate}`, () => {
      run(tool, ["--update"], root);
      return existsSync(join(root, `${gate}-budget.json`)) ? "budget committed" : "nothing to measure — left unlit";
    });
    if (ok && existsSync(join(root, `${gate}-budget.json`))) frozen.push(gate);
  }
  if (unavailable.length) {
    console.log(`  · gates not on PATH: ${unavailable.join(", ")} — install harness-gates to measure them`);
  }

  // 3 — verify. CI is confirmation; a red gate here is cheaper than a red gate on a runner.
  let verified = false;
  if (hasPkg) {
    verified = step("verify", () => {
      run("npm", ["run", "verify"], root);
      return "typecheck + lint + test green";
    });
  }

  // 4 — commit. Local and reversible, so it is part of the automated run.
  const committed = step("commit", () => {
    run("git", ["add", "-A"], root);
    run("git", ["commit", "-m", "chore: adopt the engineering harness"], root);
    return "chore: adopt the engineering harness";
  });

  console.log("");
  if (frozen.length) console.log(`  Frozen: ${frozen.join(", ")} — these budgets now block growth and only ratchet down.`);
  if (!verified && hasPkg) console.log("  ⚠ verify did not pass — fix the finding before shipping, never the gate.");

  // 5 — the handover. Naming the exact settings is the difference between a handover and a shrug.
  console.log(`
  ─ YOUR STEP ─ these need repo-admin credentials and cannot be done from here:

    1. Settings → General → Pull Requests
         ✓ Allow auto-merge          ✓ Automatically delete head branches
    2. Settings → Rules → new ruleset, target the DEFAULT BRANCH ONLY
         ✓ Require a pull request    ✓ Require status check: verify
       Targeting *all* branches deadlocks the repo — a required check can never run
       on a branch that cannot be pushed.
    3. Turn the ruleset on only AFTER \`verify\` has gone green once. A required check
       that has never reported leaves every PR stuck on "waiting for status".
`);

  if (ship && committed) {
    console.log("  Shipping is opt-in and you passed --ship:\n");
    step("push", () => {
      const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"], root).trim();
      run("git", ["push", "-u", "origin", branch], root);
      return `pushed ${branch}`;
    });
    console.log("\n  Open the PR and arm auto-merge AT OPEN — the window closes once the PR is clean.\n");
  } else if (committed) {
    console.log("  Committed locally. Nothing was pushed: a bootstrap must not put commits in someone's");
    console.log("  repository uninvited. Re-run with --ship, or push yourself.\n");
  }

  return { frozen, verified, committed };
}

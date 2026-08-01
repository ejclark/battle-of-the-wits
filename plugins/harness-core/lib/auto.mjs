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
import { GATES } from "./state.mjs";

// Named for what it is rather than `HERE`: two modules each resolving their own directory is a
// coincidental name match, not a shared abstraction waiting to be extracted.
const THIS_DIR = dirname(fileURLToPath(import.meta.url));

/** A harness executable: on PATH once installed, a sibling directory when run from a checkout. */
function resolveTool(name) {
  const sibling = join(THIS_DIR, "../../harness-gates/bin", name);
  if (existsSync(sibling)) return sibling;
  try {
    return execSync(`command -v ${name}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {
    return null;
  }
}

const ADOPT_BRANCH = "chore/adopt-the-harness";

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

export function autoAdopt(root, { ship = false, wrote = [] } = {}) {
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

  // 2 — THE GRANDFATHER STEP. Freeze today's debt so the gates block growth only. Skip it and the
  // first PR goes red for debt nobody caused, the gates get switched off, and never come back on.
  const frozen = [];
  const unavailable = [];
  for (const gate of GATES) {
    const tool = resolveTool(`harness-${gate}-scan`);
    if (!tool) {
      unavailable.push(gate);
      continue;
    }
    // A gate that cannot measure (knip absent, no test tree) must not fail the run: its budget is
    // simply not written, and that dimension stays honestly unlit.
    const ok = step(`freeze ${gate}`, () => {
      run(tool, ["--update"], root);
      return existsSync(join(root, `${gate}-budget.json`)) ? "budget committed" : "nothing to measure — left unlit";
    });
    if (ok && existsSync(join(root, `${gate}-budget.json`))) frozen.push(gate);
  }
  if (unavailable.length) {
    console.log(`  · gates not on PATH: ${unavailable.join(", ")} — install harness-gates to measure them`);
  }

  // 2b — format WHAT THIS RUN WROTE, and nothing else. The first adoption into a differently-shaped
  // repo went red on `verify` because three files the bootstrap had written sixty seconds earlier
  // failed the formatter it had just installed. Scoped to this run's own output on purpose:
  // reformatting the adopter's code uninvited would break the one promise the bootstrap makes.
  const formattable = wrote.filter((f) => /\.(m?js|ts|json)$/.test(f));
  if (hasPkg && formattable.length) {
    step("format what was written", () => {
      run("npx", ["biome", "format", "--write", "--no-errors-on-unmatched", ...formattable], root);
      return `${formattable.length} file(s)`;
    });
  }

  // 3 — verify. CI is confirmation; a red gate here is cheaper than a red gate on a runner.
  let verified = false;
  let formatOnly = false;
  if (hasPkg) {
    verified = step("verify", () => {
      run("npm", ["run", "verify"], root);
      return "typecheck + lint + test green";
    });
    // WHOSE FAULT IS THE RED? A first verify that fails ONLY on formatting is failing on the
    // adopter's pre-existing source, against a formatter this run just installed — not on anything
    // they did and not on a defect. Reported as itself, because "verify did not pass" over
    // whitespace reads as a broken tool on the first minute of contact, and that is how a quality
    // system gets switched off before it has proved anything.
    //
    // It is NOT auto-fixed. Reformatting someone's entire codebase uninvited breaks the one promise
    // this bootstrap makes, and the grandfather rule says freeze today's debt rather than demand a
    // flag day. So: name it, hand over the single command, and let them decide.
    if (!verified) {
      try {
        run("npx", ["biome", "check", "--formatter-enabled=false", "."], root);
        formatOnly = true;
      } catch {
        formatOnly = false;
      }
    }
  }

  // 4 — branch, THEN commit. This used to commit straight to the default branch, walking the adopter
  // into a deadlock of its own making: the handover below tells them to require pull requests, and
  // the adoption commit is then stranded where it can no longer be pushed. A bootstrap that violates
  // the doctrine it installs teaches the adopter that the doctrine is optional.
  const onBranch = step("branch", () => {
    const current = run("git", ["rev-parse", "--abbrev-ref", "HEAD"], root).trim();
    if (current !== "main" && current !== "master") return `already on ${current}`;
    run("git", ["checkout", "-b", ADOPT_BRANCH], root);
    return ADOPT_BRANCH;
  });
  const committed =
    onBranch &&
    step("commit", () => {
      run("git", ["add", "-A"], root);
      run("git", ["commit", "-m", "chore: adopt the engineering harness"], root);
      return "chore: adopt the engineering harness";
    });

  console.log("");
  if (frozen.length) console.log(`  Frozen: ${frozen.join(", ")} — these budgets now block growth and only ratchet down.`);
  if (!verified && hasPkg) {
    console.log(
      formatOnly
        ? `  ⚠ verify is red on FORMATTING ONLY — on your EXISTING sources, against a formatter this
      run just installed. Nothing you wrote is wrong and nothing here is broken; the two have
      simply never met. One command settles it, and it is yours to run or not:

          npm run lint:fix

      Not done for you on purpose: reformatting a codebase uninvited is the one thing a bootstrap
      must never do, and the grandfather rule says freeze today's debt rather than demand a flag day.`
        : "  ⚠ verify did not pass — fix the finding before shipping, never the gate.",
    );
  }

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

  Expect \`harness-preflight\` to REFUSE this adoption commit. That is correct: adoption is the
  one change that legitimately writes .github/workflows/ and .claude/settings.json, which is
  exactly the class it exists to keep an agent out of. Review those two files yourself.
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
    console.log(`  Committed on ${ADOPT_BRANCH}. Nothing was pushed: a bootstrap must not put commits`);
    console.log("  in someone's repository uninvited. Re-run with --ship, or push yourself.\n");
  }

  return { frozen, verified, committed };
}

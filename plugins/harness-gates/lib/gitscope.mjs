// WHAT THIS CHANGE IS, ACCORDING TO GIT — the two questions the preflight is built on.
//
// Both were inline in preflight.mjs, and both had already been wrong once in the same way: they
// answered a slightly different question than the one being asked, and the gate reported a
// confident verdict anyway. Extracted so they can be tested by import rather than only through the
// executable that uses them.
import { execFileSync } from "node:child_process";

const gitOut = (repo, args) =>
  execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/**
 * The default branch as BOTH a name and a comparison ref. Conflating them was a real hole: the name
 * answers "am I on the default branch?", the ref is what every diff is taken against. This stripped
 * `origin/` and used the result for both, so comparisons ran against the LOCAL `main` — in an
 * athlete's unfetched worktree, a stale commit. The failure is not symmetric: a stale base invents
 * violations that are not there and HIDES ones that are, and a false clear from the gate guarding
 * the irreversible class is the expensive direction.
 */
export function defaultBranch(repo) {
  let name = "main";
  for (const guess of ["origin/HEAD", "origin/main", "main", "master"]) {
    try {
      name = gitOut(repo, ["rev-parse", "--abbrev-ref", guess]).replace(/^origin\//, "");
      break;
    } catch {
      /* try the next */
    }
  }
  try {
    gitOut(repo, ["rev-parse", "--verify", `origin/${name}`]);
    return { name, ref: `origin/${name}` }; // what the PR will actually be diffed against
  } catch {
    return { name, ref: name }; // no remote — the local branch is the only base available
  }
}

/**
 * Every file this change touches — committed, staged, modified, AND UNTRACKED. `git diff` never
 * reports a file that was never added, so a diff-only preflight waved through the dangerous case:
 * an athlete CREATING .github/workflows/evil.yml rather than editing one.
 */
export function changedFiles(repo, base) {
  const out = new Set();
  for (const args of [
    ["diff", "--name-only", `${base}...HEAD`],
    ["diff", "--name-only"],
    ["diff", "--name-only", "--cached"],
    ["ls-files", "--others", "--exclude-standard"],
  ]) {
    try {
      for (const f of gitOut(repo, args).split("\n")) if (f) out.add(f);
    } catch {
      /* no such ref yet — the other sources still apply */
    }
  }
  // .harness/ is runtime coordination state — the claims registry itself. It is never part of a
  // change, and counting it would have every athlete fail its own territory check.
  return [...out].filter((f) => !f.startsWith(".harness/"));
}

/** The branch HEAD is on, or "" in an unborn repository. */
export function currentBranch(repo) {
  try {
    return gitOut(repo, ["rev-parse", "--abbrev-ref", "HEAD"]);
  } catch {
    return "";
  }
}

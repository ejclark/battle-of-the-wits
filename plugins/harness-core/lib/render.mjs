// Shared rendering primitives for the visual ladder.
//
// Small on purpose. The rule the ladder runs on is that each rung is a new VIEW over ONE model, and
// the corollary is that the views may share their plumbing but never their conclusions: escaping and
// argument parsing are plumbing, "what counts as a big file" is a conclusion and lives in model.mjs.
//
// The duplication gate asked for this in the same change that introduced the second view, which is
// the earliest it could possibly have asked. Worth noting rather than quietly obeying: the gate was
// right, and it was right about a file whose whole purpose was to prevent that class of drift.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

/** HTML-escape. Every value that reaches a page is untrusted — file names most of all. */
export const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** The `-o | --out PATH` every renderer accepts, resolved against the cwd. */
export function outPath(argv, fallback) {
  const i = Math.max(argv.indexOf("-o"), argv.indexOf("--out"));
  return resolve(i >= 0 ? argv[i + 1] : fallback);
}

/**
 * The whole body of a write-a-view CLI: parse `-o`, name the repo, render, write, say where.
 *
 * Extracted when the third renderer arrived and the duplication gate counted three identical CLI
 * bodies — which is the gate doing its job at the earliest moment it could. Each launcher keeps its
 * own file (a launcher must name a module), but the four lines inside were the same four lines, and
 * a fourth rung would have made it five copies of a behaviour that has to stay identical: these
 * commands are documented together and must not drift apart in how they take arguments.
 */
export function writeViewCli(argv, fallback, renderDoc, label) {
  const out = outPath(argv, fallback);
  writeFileSync(out, renderDoc(process.cwd(), repoNameOf(process.cwd())));
  console.log(`✓ ${label} written — ${out}`);
}

/**
 * Run git under `root` and hand back stdout, or null.
 *
 * Null covers every way this can fail to answer — not a repository, no commits yet, a path git has
 * never seen — because all three are STATES a view has to render honestly, and none is an error a
 * visualiser should die on. The distinction between them is the caller's to draw if it needs one.
 *
 * Shared because the duplication gate caught the second copy the moment it appeared, in a file whose
 * whole purpose is shared plumbing. Two swallow-the-error git runners drift in what they swallow.
 */
export function gitOut(root, args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

/**
 * The REPOSITORY's name, not the checkout directory's.
 *
 * A worktree is routinely called something like `repo-2`, and that in the title of a file people
 * share reads as a different project. Falls back to the directory when there is no remote — an
 * answer, rather than an empty title.
 */
export function repoNameOf(root) {
  try {
    const url = execFileSync("git", ["remote", "get-url", "origin"], { cwd: root, encoding: "utf8" });
    return basename(url.trim().replace(/\.git$/, ""));
  } catch {
    return basename(root);
  }
}

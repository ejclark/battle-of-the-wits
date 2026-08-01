// The blast-radius preflight is what turns doctrine into a gate.
//
// "PRs only, never touch workflow files or credentials" stops a careful reader. An autonomous
// athlete is not a reader — it is a process that does whatever its diff contains. Every case here
// asserts a REFUSAL, because a preflight that has only been seen to pass has not been tested at all.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeRepo, runTool, bin } from "./helpers.mjs";

const PREFLIGHT = bin("harness-gates", "harness-preflight");
const git = (root, args) => execFileSync("git", args, { cwd: root, stdio: "ignore" });

/** A repo on a feature branch with one commit on main — the shape an athlete actually works in. */
function repoOnBranch(files = {}, committed = {}) {
  const root = makeRepo();
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.email", "t@t"]);
  git(root, ["config", "user.name", "T"]);
  writeFileSync(join(root, "seed.txt"), "seed\n");
  for (const [p, c] of Object.entries(committed)) {
    mkdirSync(join(root, p, ".."), { recursive: true });
    writeFileSync(join(root, p), c);
  }
  git(root, ["add", "-A"]);
  git(root, ["commit", "-qm", "init"]);
  git(root, ["checkout", "-q", "-b", "work"]);
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(join(root, p, ".."), { recursive: true });
    writeFileSync(join(root, p), c);
  }
  return root;
}

test("it refuses a workflow file even when the file is brand new", () => {
  // The dangerous case is CREATION, not edit — and `git diff` does not report untracked files, so a
  // preflight built on diff alone waves this straight through.
  const root = repoOnBranch({ ".github/workflows/evil.yml": "on: push\n" });
  try {
    const { code, out } = runTool(PREFLIGHT, root);
    assert.equal(code, 1);
    assert.match(out, /evil\.yml/);
    assert.match(out, /credentials/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("it refuses credential-shaped files", () => {
  const root = repoOnBranch({ ".env": "SECRET=1\n", "certs/server.pem": "-----BEGIN\n" });
  try {
    const { code, out } = runTool(PREFLIGHT, root);
    assert.equal(code, 1);
    assert.match(out, /\.env/);
    assert.match(out, /server\.pem/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("it refuses a RAISED budget but allows a lowered one", () => {
  // An athlete that can raise its own budget marks its own homework, which turns every gate into
  // decoration. The direction is the whole point of a ratchet.
  const up = repoOnBranch({ "arch-budget.json": '{"total":9}' }, { "arch-budget.json": '{"total":5}' });
  const down = repoOnBranch({ "arch-budget.json": '{"total":3}' }, { "arch-budget.json": '{"total":5}' });
  try {
    const raised = runTool(PREFLIGHT, up);
    assert.equal(raised.code, 1);
    assert.match(raised.out, /5 → 9/);
    assert.match(raised.out, /marking your own homework/);

    assert.equal(runTool(PREFLIGHT, down).code, 0, "lowering a budget is the whole point");
  } finally {
    rmSync(up, { recursive: true, force: true });
    rmSync(down, { recursive: true, force: true });
  }
});

test("it refuses work done directly on the default branch", () => {
  const root = repoOnBranch();
  try {
    git(root, ["checkout", "-q", "main"]);
    writeFileSync(join(root, "x.ts"), "export const x = 1;\n");
    const { code, out } = runTool(PREFLIGHT, root);
    assert.equal(code, 1);
    assert.match(out, /working directly on main/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("with --agent it binds the diff to claimed territory", () => {
  // This is what turns claims from advisory into binding. A claim nobody checks is a comment.
  const root = repoOnBranch({ "src/in.ts": "export const a = 1;\n", "elsewhere.ts": "export const b = 2;\n" });
  try {
    mkdirSync(join(root, ".harness"), { recursive: true });
    writeFileSync(
      join(root, ".harness/claims.json"),
      JSON.stringify([{ agent: "decomposer", paths: ["src"], expires: Date.now() + 3.6e6 }]),
    );
    const { code, out } = runTool(PREFLIGHT, root, ["--agent", "decomposer"]);
    assert.equal(code, 1);
    assert.match(out, /elsewhere\.ts.*outside the territory/);
    assert.doesNotMatch(out, /src\/in\.ts.*outside/, "claimed paths must not be flagged");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an agent with no claim at all is refused", () => {
  const root = repoOnBranch({ "src/in.ts": "export const a = 1;\n" });
  try {
    const { code, out } = runTool(PREFLIGHT, root, ["--agent", "ghost"]);
    assert.equal(code, 1);
    assert.match(out, /holds no territory/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an ordinary change on a branch passes", () => {
  // The rail must not block real work — a preflight that refuses everything gets switched off.
  const root = repoOnBranch({ "src/feature.ts": "export const f = 1;\n" });
  try {
    const { code, out } = runTool(PREFLIGHT, root);
    assert.equal(code, 0);
    assert.match(out, /preflight clear/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// A stale local `main` must not become the yardstick.
//
// `defaultBranch()` resolved `origin/HEAD`, then stripped the `origin/` prefix and used the result
// as BOTH the branch name and the comparison ref — so every diff was taken against the LOCAL `main`,
// whatever that happened to be. In a worktree that has not fetched (an athlete's, typically) that is
// a stale commit.
//
// The failure is not symmetric. A stale base invents violations that are not there — annoying — and
// HIDES violations that are — which is a false clear from the gate that guards the irreversible
// class. This case pins the second direction by construction: the budget raise it checks for is
// visible only against the stale local ref, and must not be reported.
test("the comparison base is the remote-tracking ref, not a stale local branch", () => {
  const origin = mkdtempSync(join(tmpdir(), "botw-origin-"));
  execFileSync("git", ["init", "-q", "--bare", "-b", "main", origin], { stdio: "pipe" });

  const root = mkdtempSync(join(tmpdir(), "botw-stale-"));
  const git = (...a) => execFileSync("git", a, { cwd: root, stdio: "pipe", encoding: "utf8" });
  execFileSync("git", ["clone", "-q", origin, root], { stdio: "pipe" });
  git("config", "user.email", "probe@example.com");
  git("config", "user.name", "probe");

  // c1: the budget is low.
  writeFileSync(join(root, "arch-budget.json"), JSON.stringify({ "src/a.ts": 1 }));
  git("add", "-A");
  git("commit", "-qm", "c1");
  git("push", "-q", "origin", "main");

  // c2: someone raised it deliberately, in a reviewed PR. This is now the real base.
  writeFileSync(join(root, "arch-budget.json"), JSON.stringify({ "src/a.ts": 9 }));
  git("add", "-A");
  git("commit", "-qm", "c2");
  git("push", "-q", "origin", "main");
  const c1 = git("rev-parse", "HEAD~1").trim();

  // A branch off the REAL base, changing nothing about the budget…
  git("checkout", "-qb", "feature");
  writeFileSync(join(root, "note.txt"), "ordinary work\n");
  git("add", "-A");
  git("commit", "-qm", "work");

  // …in a worktree whose local `main` has fallen behind, which is the normal state of an athlete's
  // checkout. Against c1 the budget reads as 1 → 9, a raise. Against origin/main it is unchanged.
  git("update-ref", "refs/heads/main", c1);

  const r = runTool(bin("harness-gates", "harness-preflight"), root);
  assert.equal(r.code, 0, `preflight must diff against origin/main, not the stale local main:\n\n${r.out}`);
  assert.match(r.out, /origin\/main/, "and it should say which ref it compared against");
});

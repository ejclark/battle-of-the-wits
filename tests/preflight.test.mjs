// The blast-radius preflight is what turns doctrine into a gate.
//
// "PRs only, never touch workflow files or credentials" stops a careful reader. An autonomous
// athlete is not a reader — it is a process that does whatever its diff contains. Every case here
// asserts a REFUSAL, because a preflight that has only been seen to pass has not been tested at all.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
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

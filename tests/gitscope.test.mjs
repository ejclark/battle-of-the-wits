import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { changedFiles, currentBranch, defaultBranch } from "../plugins/harness-gates/lib/gitscope.mjs";

// The two questions the blast-radius preflight is built on: what is the base, and what did this
// change touch. Both have been wrong once, and in the same way — they answered a slightly different
// question than the one being asked, while the gate reported a confident verdict anyway.

const init = () => {
  const root = mkdtempSync(join(tmpdir(), "botw-scope-"));
  const git = (...a) => execFileSync("git", a, { cwd: root, stdio: "pipe", encoding: "utf8" });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "probe@example.com");
  git("config", "user.name", "probe");
  return { root, git };
};

test("with no remote, the name and the comparison ref are the same", () => {
  const { root, git } = init();
  writeFileSync(join(root, "a.txt"), "a\n");
  git("add", "-A");
  git("commit", "-qm", "c1");
  assert.deepEqual(defaultBranch(root), { name: "main", ref: "main" });
});

test("with a remote, the comparison ref is the remote-tracking branch", () => {
  const origin = mkdtempSync(join(tmpdir(), "botw-origin-"));
  execFileSync("git", ["init", "-q", "--bare", "-b", "main", origin], { stdio: "pipe" });
  const { root, git } = init();
  git("remote", "add", "origin", origin);
  writeFileSync(join(root, "a.txt"), "a\n");
  git("add", "-A");
  git("commit", "-qm", "c1");
  git("push", "-q", "-u", "origin", "main");
  // The name still answers "am I on the default branch?"; the ref is what a PR is diffed against.
  assert.deepEqual(defaultBranch(root), { name: "main", ref: "origin/main" });
});

test("changedFiles reports a file that has never been added", () => {
  // `git diff` does not. A preflight built on diff alone waved through an athlete CREATING
  // .github/workflows/evil.yml — the more dangerous half, and the one it exists to stop.
  const { root, git } = init();
  writeFileSync(join(root, "a.txt"), "a\n");
  git("add", "-A");
  git("commit", "-qm", "c1");
  writeFileSync(join(root, "brand-new.txt"), "never added\n");
  assert.ok(changedFiles(root, "main").includes("brand-new.txt"));
});

test("changedFiles reports staged and unstaged edits", () => {
  const { root, git } = init();
  writeFileSync(join(root, "a.txt"), "a\n");
  writeFileSync(join(root, "b.txt"), "b\n");
  git("add", "-A");
  git("commit", "-qm", "c1");
  writeFileSync(join(root, "a.txt"), "edited\n");
  writeFileSync(join(root, "b.txt"), "staged\n");
  git("add", "b.txt");
  const touched = changedFiles(root, "main");
  assert.ok(touched.includes("a.txt"));
  assert.ok(touched.includes("b.txt"));
});

test("changedFiles never counts the runtime registry", () => {
  // .harness/ is the claims registry — coordination state, never part of a change. Counting it
  // would make every athlete fail its own territory check.
  const { root, git } = init();
  writeFileSync(join(root, "a.txt"), "a\n");
  git("add", "-A");
  git("commit", "-qm", "c1");
  execFileSync("mkdir", ["-p", join(root, ".harness")]);
  writeFileSync(join(root, ".harness/claims.json"), "[]\n");
  assert.deepEqual(changedFiles(root, "main").filter((f) => f.startsWith(".harness/")), []);
});

test("currentBranch answers empty in an unborn repository rather than throwing", () => {
  const { root, git } = init();
  assert.equal(typeof currentBranch(root), "string");
  writeFileSync(join(root, "a.txt"), "a\n");
  git("add", "-A");
  git("commit", "-qm", "c1");
  git("checkout", "-qb", "feature");
  assert.equal(currentBranch(root), "feature");
});

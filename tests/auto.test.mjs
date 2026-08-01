import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { bin, makeGitRepo, runTool } from "./helpers.mjs";

// `--auto` is the adopter's entire first experience, and nothing had ever run it end to end.
//
// The first run found what a read would not have: it committed straight to the default branch, and
// then the handover it prints tells the adopter to enable a ruleset requiring pull requests. The
// adoption commit is stranded on a branch that can no longer be pushed — and `harness-preflight`,
// installed by that same run, refuses exactly this. A bootstrap that violates the doctrine it
// installs teaches the adopter that the doctrine is optional.
//
// These cases use a repo with no package.json on purpose: it skips `npm install` and `npm run
// verify`, so the adoption sequence itself is what is under test rather than a package manager.

const auto = (root) => runTool(bin("harness-core", "harness-bootstrap"), root, ["--auto"]);

test("adoption lands on its own branch, never on the default branch", () => {
  const { root, git } = makeGitRepo();
  const r = auto(root);
  assert.equal(r.code, 0, r.out);
  assert.equal(git("rev-parse", "--abbrev-ref", "HEAD").trim(), "chore/adopt-the-harness");
  assert.match(git("log", "-1", "--pretty=%s"), /adopt the engineering harness/);
  assert.match(git("log", "main", "-1", "--pretty=%s"), /init/, "the default branch is untouched");
});

test("an adopter already on a feature branch is left where they are", () => {
  const { root, git } = makeGitRepo();
  git("checkout", "-qb", "spike/try-the-harness");
  auto(root);
  assert.equal(git("rev-parse", "--abbrev-ref", "HEAD").trim(), "spike/try-the-harness");
});

test("it freezes today's debt rather than blocking on it", () => {
  // The grandfather step. Skipping it is how adoption fails: the first PR goes red for pre-existing
  // debt nobody caused, the gates get switched off, and they never come back on.
  const { root } = makeGitRepo();
  auto(root);
  for (const b of ["arch-budget.json", "dupe-budget.json", "clone-budget.json"]) {
    assert.ok(existsSync(join(root, b)), `${b} should have been frozen`);
  }
});

test("a gate that cannot measure leaves its dimension honestly unlit", () => {
  // knip is not installed in a bare repo, so dead-code cannot be measured. The run must report that
  // and continue — writing a budget it could not compute would be a fabricated clean bill of health.
  const { root } = makeGitRepo();
  const r = auto(root);
  assert.match(r.out, /nothing to measure — left unlit/);
  assert.equal(existsSync(join(root, "dead-budget.json")), false);
});

test("it never pushes without being asked", () => {
  const { root, git } = makeGitRepo();
  auto(root);
  assert.doesNotMatch(git("branch", "-r"), /chore\/adopt-the-harness/);
});

test("the handover names the credentialed steps and warns about the refusal to come", () => {
  const { root } = makeGitRepo();
  const r = auto(root);
  assert.match(r.out, /Allow auto-merge/);
  assert.match(r.out, /DEFAULT BRANCH ONLY/, "an all-branches ruleset deadlocks the repo");
  assert.match(r.out, /harness-preflight.*REFUSE/s, "the expected refusal must not read as a bug");
});

test("re-running is safe — nothing already decided is clobbered", () => {
  const { root } = makeGitRepo();
  auto(root);
  writeFileSync(join(root, "biome.json"), '{"mine":true}\n');
  const r = auto(root);
  assert.equal(r.code, 0, r.out);
  assert.equal(JSON.parse(execFileSync("cat", [join(root, "biome.json")], { encoding: "utf8" })).mine, true);
});

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { bin, makeRepo } from "./helpers.mjs";

// `harness-ship` is the athlete's LAST command, the way `--candidate` is its first. It had never
// been run by anything, and it showed: it was lifted verbatim out of the repository the harness grew
// in and still invoked `node scripts/incident-scan.mjs` — a path that exists in no adopter's repo —
// told the caller to read `.claude/skills/ship/SKILL.md`, and printed a usage line for a file called
// `scripts/ship.sh`. Every instruction it gave named something the reader does not have.
//
// Opening a real PR cannot be tested here. What can be — and what actually protects an athlete — is
// that every REFUSAL fires before anything irreversible happens, and says why.
const SHIP = bin("harness-gates", "harness-ship");

function ship(cwd, args, env = {}) {
  try {
    return { code: 0, out: execFileSync(SHIP, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...env } }) };
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

/** A repo with one commit on `main`, so HEAD resolves and the tree is clean. */
function repoOnMain(files = {}) {
  const root = makeRepo({ "README.md": "probe\n", ...files });
  const git = (...a) => execFileSync("git", a, { cwd: root, stdio: "pipe" });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "probe@example.com");
  git("config", "user.name", "probe");
  git("add", "-A");
  git("commit", "-qm", "init");
  return root;
}

test("no token is refused before anything else happens", () => {
  const r = ship(repoOnMain(), ["open", "a title"], { GH_TOKEN: "", GITHUB_TOKEN: "" });
  assert.equal(r.code, 1);
  assert.match(r.out, /no GH_TOKEN/);
});

test("no subcommand prints usage naming the real command", () => {
  const r = ship(repoOnMain(), [], { GH_TOKEN: "x" });
  assert.equal(r.code, 1);
  assert.match(r.out, /usage: harness-ship/);
  assert.doesNotMatch(r.out, /scripts\/ship\.sh/, "the pre-plugin path must not survive");
});

test("open without a title is refused", () => {
  const r = ship(repoOnMain(), ["open"], { GH_TOKEN: "x" });
  assert.equal(r.code, 1);
  assert.match(r.out, /title required/);
});

test("shipping the base branch into itself is refused", () => {
  const r = ship(repoOnMain(), ["open", "a title", "--no-verify"], { GH_TOKEN: "x" });
  assert.equal(r.code, 1);
  assert.match(r.out, /refusing to open a PR from main into itself/);
});

test("an uncommitted change is refused before the push", () => {
  const root = repoOnMain();
  execFileSync("git", ["checkout", "-qb", "feature"], { cwd: root, stdio: "pipe" });
  writeFileSync(join(root, "README.md"), "dirty\n");
  const r = ship(root, ["open", "a title", "--no-verify"], { GH_TOKEN: "x" });
  assert.equal(r.code, 1);
  assert.match(r.out, /uncommitted changes/);
});

test("merge without a PR number is refused", () => {
  const r = ship(repoOnMain(), ["merge"], { GH_TOKEN: "x" });
  assert.equal(r.code, 1);
  assert.match(r.out, /PR number required/);
});

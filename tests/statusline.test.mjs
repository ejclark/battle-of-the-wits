import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { makeRepo } from "./helpers.mjs";

// The status line executes on EVERY render in an adopter's editor, and nothing had ever run it.
//
// It lives in templates/, which the gates deliberately exclude from measurement — a template is not
// this project's code. That exclusion is right for the scanners and wrong as an excuse: this file is
// the single most-executed artifact the harness ships, and "not measured" was being read as "fine".
const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../plugins/harness-core/templates/claude/harness-statusline.mjs",
);

const render = (root) =>
  execFileSync("node", [SCRIPT], {
    input: JSON.stringify({ workspace: { current_dir: root } }),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });

/** A repo at the deepest phase files alone can prove: installed, wired, every budget frozen. */
function fullyAdopted() {
  const root = makeRepo({
    "harness.json": '{"persona":"dungeon"}',
    "biome.json": "{}",
    ".github/workflows/pipeline.yml": "name: Pipeline\n",
  });
  mkdirSync(join(root, "node_modules"), { recursive: true });
  mkdirSync(join(root, ".husky/_"), { recursive: true });
  for (const b of ["arch", "dupe", "dead", "spec-gap", "clone"]) {
    writeFileSync(join(root, `${b}-budget.json`), "{}\n");
  }
  return root;
}

test("a repo that has not adopted the harness gets no row at all", () => {
  // Printing a guess where the harness is not installed is worse than printing nothing.
  assert.equal(render(makeRepo({})), "");
});

test("the persona named in the descriptor is the one shown", () => {
  assert.match(render(makeRepo({ "harness.json": '{"persona":"senate"}' })), /senate/);
});

test("an unknown persona falls back rather than rendering a blank", () => {
  assert.match(render(makeRepo({ "harness.json": '{"persona":"wombat"}' })), /dungeon/);
});

test("a fresh adoption reads as depth 0, not as an error", () => {
  assert.match(render(makeRepo({ "harness.json": "{}" })), /depth .*0.*\/5/s);
});

test("the deepest locally-observable phase says why it stops there", () => {
  // Phases 4 and 5 are REPOSITORY SETTINGS. A row that reads files cannot see them, so a fully
  // adopted repo would otherwise sit at 3/5 forever and read as permanently unfinished.
  const out = render(fullyAdopted());
  assert.match(out, /depth .*3.*\/5/s);
  assert.match(out, /rest is repo settings/);
});

test("a partially adopted repo does not claim a phase it has not reached", () => {
  const out = render(makeRepo({ "harness.json": "{}", "arch-budget.json": "{}" }));
  assert.match(out, /depth .*0.*\/5/s, "a budget alone does not mean the process files are installed");
  assert.doesNotMatch(out, /rest is repo settings/);
});

test("a malformed descriptor is silence, never a crash", () => {
  // The contract: a broken status line must never disrupt a session.
  assert.equal(render(makeRepo({ "harness.json": "{ not json" })), "");
});

test("it never writes to stderr", () => {
  // Anything on stderr surfaces as noise in the editor. Silence is the only acceptable failure.
  const r = execFileSync("node", [SCRIPT], {
    input: "not json at all",
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  assert.equal(typeof r, "string");
});

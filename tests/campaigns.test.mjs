// Campaigns turn a list of findings into a decision about outcomes.
//
// The failure mode worth guarding is subtle: a campaign that groups by WHICH SCANNER found something
// rather than by what clearing it BUYS. That produces labels glued on after the fact — "here are the
// duplication findings" — which is a backlog in a costume and leaves the reader to work out the
// value themselves. Every case below pins the value statement, not the layout.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { makeRepo, bin, runLauncher } from "./helpers.mjs";
import { readFileSync } from "node:fs";
import { bossList } from "../plugins/harness-core/lib/state.mjs";

const BIN = bin("harness-core", "harness-dungeon");
const today = (cwd) => runLauncher(BIN, ["--today"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });


/** A repo with every dimension measured, so "unlit" never masks what is being tested. */
const measured = (extra = {}) => ({
  "package.json": "{}\n",
  "arch-budget.json": "{}",
  "dupe-budget.json": '{"duplicateDefs":0}',
  "dead-budget.json": "{}",
  "spec-gap-budget.json": '{"untestedFiles":0}',
  "clone-budget.json": '{"clones":0}',
  "docs/LESSONS.md": "# Lessons\n",
  ...extra,
});

test("every dungeon states what clearing it BUYS, not just what is wrong", () => {
  const root = makeRepo(measured({ "arch-budget.json": '{"a.ts":900}', "dupe-budget.json": '{"duplicateDefs":5}' }));
  try {
    const out = today(root);
    const dungeons = out.split(/\n\s+\d+\.\s/).slice(1);
    assert.ok(dungeons.length >= 2, "expected at least two dungeons");
    for (const d of dungeons) {
      assert.match(d, /CLEARING THIS BUYS/, "a dungeon without a payoff is a backlog in a costume");
      assert.match(d, /party/, "a dungeon must name who fights it");
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("grouping follows the capability unlocked, not which scanner reported it", () => {
  // Duplication and clones come from DIFFERENT scanners but buy the same thing, so they share a
  // dungeon. This is the property that keeps the value statement honest.
  const root = makeRepo(measured({ "dupe-budget.json": '{"duplicateDefs":7}', "clone-budget.json": '{"clones":3}' }));
  try {
    const out = today(root);
    const halls = out.slice(out.indexOf("The Mirror Halls"));
    assert.match(halls, /7 duplicated definitions/);
    assert.match(halls, /3 copy-pasted blocks/, "two scanners, one dungeon — grouped by payoff");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("The Unmapped is offered first when anything is unlit", () => {
  const root = makeRepo({ "package.json": "{}\n", "arch-budget.json": '{"a.ts":900}' });
  try {
    const out = today(root);
    assert.ok(
      out.indexOf("The Unmapped") < out.indexOf("The Foundry"),
      "fighting in the dark is how you pick the wrong fight — unlit must lead",
    );
    assert.match(out, /blind spot/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the structural dungeon is gated behind verification when both are live", () => {
  // Decomposing what nothing asserts on is the dangerous order, and the warning belongs on the
  // dungeon — where the choice is actually made — not buried in a doc.
  const root = makeRepo(measured({ "arch-budget.json": '{"big.ts":1200}', "spec-gap-budget.json": '{"untestedFiles":6}' }));
  try {
    const out = today(root);
    assert.match(out, /The Proving Grounds/);
    assert.match(out, /locked/, "The Foundry must read as locked while specs are missing");
    assert.match(out, /clear The Proving Grounds first/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a fully-measured, fully-met repo offers nothing rather than inventing work", () => {
  const root = makeRepo(measured());
  try {
    const out = today(root);
    assert.match(out, /None\./);
    assert.match(out, /go write an idea down/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("what the scanner WRITES is what the game READS — round trip, no fabricated fixture", () => {
  // THE BUG THIS EXISTS TO MAKE IMPOSSIBLE, and it survived the whole life of the project.
  //
  // spec-gap-scan writes `untestedFiles`. bossList and the forge read `untested` — a key nothing has
  // ever written. So The Unwatched never appeared, The Proving Grounds campaign never appeared, and
  // because The Foundry is gated behind it, THE ONLY REAL PREREQUISITE MECHANIC IN THE GAME NEVER
  // FIRED. Nothing went red: `undefined > 0` is false, and a boss that never appears is
  // indistinguishable from a repository with no spec gap.
  //
  // Every existing fixture fabricated `{"untested": N}` by hand, so the tests agreed with the bug
  // instead of catching it — a vacuous green guarding the mechanic that makes this a game.
  //
  // The fix is to stop hand-writing the budget. This runs the REAL scanner, then asks the REAL
  // reader what it sees. The two cannot drift again without this going red, whatever either one
  // decides to call the key.
  const root = makeRepo({
    "package.json": "{}\n",
    "harness.json": '{"sourceDir":"lib","testDir":"spec","sourceExt":".mjs","specSuffix":".test.mjs"}',
    "lib/alpha.mjs": "export const a = 1;\n",
    "lib/beta.mjs": "export const b = 2;\n",
  });
  const scan = runLauncher(bin("harness-gates", "harness-spec-gap-scan"), ["--update"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.match(scan, /updated/, `the scanner did not write a budget:\n${scan}`);

  const written = JSON.parse(readFileSync(join(root, "spec-gap-budget.json"), "utf8"));
  const debt = Object.values(written).find((v) => typeof v === "number");
  assert.ok(debt > 0, `the fixture must actually have a spec gap, got ${JSON.stringify(written)}`);

  const bosses = bossList(root);
  const unwatched = bosses.find((b) => b.kind === "spec-gap");
  assert.ok(
    unwatched,
    `the scanner wrote ${JSON.stringify(written)} and bossList saw no spec-gap boss — ` +
      "the writer and the reader disagree about the key name",
  );
  assert.match(unwatched.detail, new RegExp(`^${debt} `), "the boss must report the number the scanner wrote");
});

test("a repo with a spec gap gets The Proving Grounds, and it gates The Foundry", () => {
  // The mechanic itself, end to end, on a budget the scanner wrote. Both directions asserted: the
  // existing suite only ever checked that something was LOCKED, never that clearing the prerequisite
  // unlocks it — which is the half that makes a lock mean anything.
  const root = makeRepo({
    "package.json": "{}\n",
    "harness.json": '{"sourceDir":"lib","testDir":"spec","sourceExt":".mjs","specSuffix":".test.mjs"}',
    "lib/alpha.mjs": "export const a = 1;\n",
    "arch-budget.json": '{"lib/huge.mjs":1200}',
    "dupe-budget.json": '{"duplicateDefs":0}',
    "dead-budget.json": "{}",
    "clone-budget.json": '{"clones":0}',
    "docs/LESSONS.md": "# Lessons\n",
  });
  runLauncher(bin("harness-gates", "harness-spec-gap-scan"), ["--update"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const out = today(root);
  assert.match(out, /The Proving Grounds/, "a repo with untested modules must offer The Proving Grounds");
  assert.match(out, /The Foundry/, "and it still has god-files to offer");
  assert.match(out, /locked/i, "The Foundry is gated behind the prerequisite — that gate must be visible");

  // And clearing it unlocks: with no spec gap, The Proving Grounds is gone and nothing is locked.
  const cleared = makeRepo({
    "package.json": "{}\n",
    "arch-budget.json": '{"lib/huge.mjs":1200}',
    "dupe-budget.json": '{"duplicateDefs":0}',
    "dead-budget.json": "{}",
    "spec-gap-budget.json": '{"untestedFiles":0}',
    "clone-budget.json": '{"clones":0}',
    "docs/LESSONS.md": "# Lessons\n",
  });
  const after = today(cleared);
  assert.doesNotMatch(after, /The Proving Grounds/, "no spec gap, no Proving Grounds");
  assert.doesNotMatch(after, /locked/i, "with the prerequisite gone, nothing may still read as locked");
});

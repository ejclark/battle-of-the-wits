// Campaigns turn a list of findings into a decision about outcomes.
//
// The failure mode worth guarding is subtle: a campaign that groups by WHICH SCANNER found something
// rather than by what clearing it BUYS. That produces labels glued on after the fact — "here are the
// duplication findings" — which is a backlog in a costume and leaves the reader to work out the
// value themselves. Every case below pins the value statement, not the layout.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { makeRepo } from "./helpers.mjs";

const BIN = join(dirname(fileURLToPath(import.meta.url)), "../plugins/harness-core/bin/harness-dungeon");
const today = (cwd) => execFileSync(BIN, ["--today"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });


/** A repo with every dimension measured, so "unlit" never masks what is being tested. */
const measured = (extra = {}) => ({
  "package.json": "{}\n",
  "arch-budget.json": "{}",
  "dupe-budget.json": '{"duplicateDefs":0}',
  "dead-budget.json": "{}",
  "spec-gap-budget.json": '{"untested":0}',
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
  const root = makeRepo(measured({ "arch-budget.json": '{"big.ts":1200}', "spec-gap-budget.json": '{"untested":6}' }));
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
    assert.match(out, /go build something new/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

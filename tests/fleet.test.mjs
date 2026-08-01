// Fleet control is what makes "we have tokens to burn" safe to act on.
//
// Every case asserts a REFUSAL or a limit holding, because a governor only ever seen to say yes has
// not been tested. The kill switch in particular must be proven to actually refuse — a switch you
// trust in the moment you need it and that does nothing is worse than no switch.
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { makeRepo, runTool, bin } from "./helpers.mjs";

const FLEET = bin("harness-gates", "harness-fleet");
const fleet = (root, args) => runTool(FLEET, root, args);
const withConfig = (cfg) => makeRepo({ "harness.json": JSON.stringify({ fleet: cfg }) });

test("the WIP cap refuses the agent that would exceed it", () => {
  // The cap exists because parallel work stops paying once review capacity binds — more agents past
  // that point produce more PRs competing for the same attention.
  const root = withConfig({ maxConcurrent: 2 });
  try {
    assert.equal(fleet(root, ["--start", "a"]).code, 0);
    assert.equal(fleet(root, ["--start", "b"]).code, 0);
    const third = fleet(root, ["--start", "c"]);
    assert.equal(third.code, 1, "the third start must be refused at a cap of two");
    assert.match(third.out, /WIP cap reached/);
    assert.match(third.out, /2\/2/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("stopping an agent frees its slot", () => {
  const root = withConfig({ maxConcurrent: 1 });
  try {
    fleet(root, ["--start", "a"]);
    assert.equal(fleet(root, ["--start", "b"]).code, 1);
    fleet(root, ["--stop", "a"]);
    assert.equal(fleet(root, ["--start", "b"]).code, 0, "a released slot must be reusable");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the kill switch actually refuses starts, and resume lifts it", () => {
  const root = withConfig({ maxConcurrent: 5 });
  try {
    fleet(root, ["--halt"]);
    const blocked = fleet(root, ["--start", "a"]);
    assert.equal(blocked.code, 1);
    assert.match(blocked.out, /HALTED/);
    fleet(root, ["--resume"]);
    assert.equal(fleet(root, ["--start", "a"]).code, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the halt message states its own limit rather than implying a hard stop", () => {
  // Claiming to kill running processes would be worse than no switch — you would trust it exactly
  // when it mattered. A JSON file cannot send a signal, and the output must say so.
  const root = withConfig({});
  try {
    const { out } = fleet(root, ["--halt"]);
    assert.match(out, /finish their current unit of work/);
    assert.match(out, /kill the processes/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the token ceiling refuses a new start once spend passes it", () => {
  const root = withConfig({ maxConcurrent: 5, tokenCeiling: 1000 });
  try {
    fleet(root, ["--start", "a"]);
    fleet(root, ["--spend", "a", "600"]);
    assert.equal(fleet(root, ["--start", "b"]).code, 0, "under the ceiling, work continues");
    fleet(root, ["--spend", "a", "500"]);
    const over = fleet(root, ["--start", "c"]);
    assert.equal(over.code, 1, "a runaway loop must not burn the month");
    assert.match(over.out, /token ceiling reached/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("spend accumulates and is reported against the ceiling", () => {
  const root = withConfig({ tokenCeiling: 10000 });
  try {
    fleet(root, ["--spend", "a", "1500"]);
    const { out } = fleet(root, ["--spend", "b", "2500"]);
    assert.match(out, /4,000\/10,000/, "spend is cumulative across agents");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("no ceiling configured means no ceiling enforced", () => {
  // The harness must not invent a limit the repo never asked for.
  const root = withConfig({ maxConcurrent: 5 });
  try {
    fleet(root, ["--spend", "a", "99999999"]);
    assert.equal(fleet(root, ["--start", "b"]).code, 0);
    assert.match(fleet(root, ["--status"]).out, /no ceiling set/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("status reports slots, spend and halt state", () => {
  const root = withConfig({ maxConcurrent: 3, tokenCeiling: 500 });
  try {
    fleet(root, ["--start", "decomposer"]);
    const { out } = fleet(root, ["--status"]);
    assert.match(out, /slots\s+1\/3/);
    assert.match(out, /decomposer/);
    assert.match(out, /running/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

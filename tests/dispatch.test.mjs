// The dispatch bracket is the sequence every athlete runs inside.
//
// The rails exist separately, and asking each athlete to remember all of them in the right order is
// how a rail gets skipped. The property that matters most is ATOMICITY of acquire: a half-acquired
// athlete holds a slot it cannot use, and the WIP cap then refuses work that should have run.
// Partial failure in a coordination primitive is worse than refusal, because it degrades quietly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { makeRepo, runTool, bin } from "./helpers.mjs";

const DISPATCH = bin("harness-gates", "harness-dispatch");
const FLEET = bin("harness-gates", "harness-fleet");
const CLAIM = bin("harness-gates", "harness-claim");

const withConfig = (cfg) => makeRepo({ "harness.json": JSON.stringify({ fleet: cfg }) });

test("acquire takes a slot and territory together", () => {
  const root = withConfig({ maxConcurrent: 2 });
  try {
    const { code, out } = runTool(DISPATCH, root, ["--acquire", "decomposer", "src/auth"]);
    assert.equal(code, 0);
    assert.match(out, /cleared to work on: src\/auth/);
    assert.match(runTool(FLEET, root, ["--status"]).out, /decomposer/, "the slot must be held");
    assert.match(runTool(CLAIM, root, ["--list"]).out, /src\/auth/, "the territory must be held");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("acquire is all-or-nothing — a lost claim hands the slot straight back", () => {
  // Otherwise the refused athlete strands a slot, and the cap silently refuses the next athlete for
  // no reason anyone can see.
  const root = withConfig({ maxConcurrent: 3 });
  try {
    runTool(DISPATCH, root, ["--acquire", "first", "src/auth"]);
    const second = runTool(DISPATCH, root, ["--acquire", "second", "src/auth"]);
    assert.equal(second.code, 1, "colliding territory must refuse");
    assert.match(second.out, /slot released/);

    const status = runTool(FLEET, root, ["--status"]).out;
    assert.doesNotMatch(status, /second/, "the refused athlete must hold no slot");
    assert.match(status, /slots\s+1\/3/, "only the first athlete may hold one");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("acquire refuses when the fleet is halted, and claims nothing", () => {
  const root = withConfig({ maxConcurrent: 3 });
  try {
    runTool(FLEET, root, ["--halt"]);
    const { code } = runTool(DISPATCH, root, ["--acquire", "decomposer", "src/auth"]);
    assert.equal(code, 1);
    assert.doesNotMatch(runTool(CLAIM, root, ["--list"]).out, /src\/auth/, "a halted fleet must claim nothing");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("release gives back both the slot and the territory", () => {
  const root = withConfig({ maxConcurrent: 1 });
  try {
    runTool(DISPATCH, root, ["--acquire", "a", "src/auth"]);
    runTool(DISPATCH, root, ["--release", "a"]);
    assert.match(runTool(FLEET, root, ["--status"]).out, /slots\s+0\/1/);
    assert.match(runTool(CLAIM, root, ["--list"]).out, /territory is open/);
    assert.equal(runTool(DISPATCH, root, ["--acquire", "b", "src/auth"]).code, 0, "both must be reusable");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("release never short-circuits — a stranded slot is the invisible failure", () => {
  // Releasing territory that was never held must still release the slot. Stranded coordination
  // state is what silently serialises a fleet, and nobody notices until throughput has fallen.
  const root = withConfig({ maxConcurrent: 1 });
  try {
    runTool(FLEET, root, ["--start", "orphan"]);
    runTool(DISPATCH, root, ["--release", "orphan"]);
    assert.match(runTool(FLEET, root, ["--status"]).out, /slots\s+0\/1/, "the slot must be freed regardless");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("acquire tells the athlete the rest of the bracket", () => {
  const root = withConfig({});
  try {
    const { out } = runTool(DISPATCH, root, ["--acquire", "decomposer", "src"]);
    assert.match(out, /harness-preflight --agent decomposer/, "the next step must be stated, not assumed");
    assert.match(out, /harness-dispatch --release decomposer/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

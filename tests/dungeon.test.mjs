// The dungeon is a presentation layer over measured state — so the thing worth testing is that it
// never says something the repo doesn't support.
//
// A themed view earns its keep only while it stays honest. The failure mode is a display that reads
// encouraging regardless of reality: loot shown as earned when it isn't, depth counted for doors
// never opened, or a dimension nothing can measure quietly rendering as fine. Each case below pins
// one of those.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { makeRepo, bin, runLauncher } from "./helpers.mjs";

const BIN = bin("harness-core", "harness-dungeon");
const run = (cwd) => runLauncher(BIN, [], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });


test("an untouched repo is at the door with every power locked", () => {
  const root = makeRepo({ "package.json": "{}\n" });
  try {
    const out = run(root);
    assert.match(out, /depth 0 of 5/);
    assert.match(out, /you are at the door/);
    assert.match(out, /Merge-on-green\s+— locked/);
    assert.match(out, /Autonomous athletes\s+— locked/);
    assert.doesNotMatch(out, /✦ Merge-on-green/, "no capability may read as earned in an empty repo");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("depth counts only the contiguous prefix — a later phase satisfied by accident is not progress", () => {
  // Budgets exist (a phase-3 condition) but nothing is installed. You cannot be past a door you
  // never opened, so depth must still be 0.
  const root = makeRepo({
    "package.json": "{}\n",
    "arch-budget.json": '{"src/big.ts":900}',
    "dupe-budget.json": '{"duplicateDefs":3}',
  });
  try {
    const out = run(root);
    assert.match(out, /depth 0 of 5/, "an incidentally-satisfied later phase must not advance depth");
    assert.match(out, /The Threshold/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("bosses come from committed budgets, biggest first", () => {
  const root = makeRepo({
    "package.json": "{}\n",
    "arch-budget.json": '{"src/small.ts":100,"src/huge.ts":2000,"src/mid.ts":500}',
    "spec-gap-budget.json": '{"untested":7}',
  });
  try {
    const out = run(root);
    const bosses = out.slice(out.indexOf("BOSSES"), out.indexOf("LOOT"));
    assert.match(bosses, /src\/huge\.ts/);
    assert.match(bosses, /2000 lines/, "the boss must carry its measured stat");
    assert.ok(
      bosses.indexOf("huge.ts") < bosses.indexOf("mid.ts"),
      "bosses must be ordered by size, so the biggest threat reads first",
    );
    assert.match(bosses, /7 modules with no spec/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("unmeasured dimensions surface as fog, never as a pass", () => {
  const root = makeRepo({ "package.json": "{}\n" });
  try {
    const out = run(root);
    const fog = out.slice(out.indexOf("FOG OF WAR"));
    assert.match(fog, /dead code/, "an unmeasurable dimension must be named");
    assert.match(fog, /unfrozen/, "unfrozen debt must be named — nothing is holding the line");
    assert.match(fog, /no lessons ledger/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the map is the ADR history, and says so plainly when there isn't one", () => {
  const bare = makeRepo({ "package.json": "{}\n" });
  const mapped = makeRepo({
    "package.json": "{}\n",
    "docs/adr/0001-pick-a-datastore.md": "# ADR\n",
    "docs/adr/0002-split-the-server.md": "# ADR\n",
  });
  try {
    assert.match(run(bare), /unmapped/, "no ADRs must read as unmapped, not as clean");
    const out = run(mapped);
    assert.match(out, /0001-pick-a-datastore/);
    assert.match(out, /0002-split-the-server/);
  } finally {
    rmSync(bare, { recursive: true, force: true });
    rmSync(mapped, { recursive: true, force: true });
  }
});

test("it renders in a directory with nothing at all rather than crashing", () => {
  const root = mkdtempSync(join(tmpdir(), "botw-dungeon-"));
  try {
    const out = run(root);
    assert.match(out, /THE DUNGEON/);
    assert.doesNotMatch(out, /ENOENT|undefined|NaN/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── the forge ──────────────────────────────────────────────────────────────────
const forgeRun = (cwd) =>
  runLauncher(BIN, ["--new"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

test("the forge invents nothing — every encounter traces to a committed budget", () => {
  const root = makeRepo({
    "package.json": "{}\n",
    "arch-budget.json": '{"src/colossus.ts":2400,"src/mid.ts":600,"src/small.ts":80}',
    "dupe-budget.json": '{"duplicateDefs":12}',
  });
  try {
    const out = forgeRun(root);
    assert.match(out, /colossus\.ts/, "the biggest file must be named, not described vaguely");
    assert.match(out, /2400 lines/);
    assert.match(out, /12 duplicated definitions/);
    // Nothing may be offered that no budget supports.
    assert.doesNotMatch(out, /copy-pasted blocks/, "no clone budget means no clone encounter");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("unmeasured dimensions become unlit encounters, never silence", () => {
  const root = makeRepo({ "package.json": "{}\n", "arch-budget.json": '{"a.ts":100}' });
  try {
    const out = forgeRun(root);
    const unlit = out.slice(out.indexOf("UNLIT"));
    assert.match(unlit, /dead code/);
    assert.match(unlit, /duplication/);
    assert.match(unlit, /harness-dupe-scan --update/, "each unlit dimension must carry its fix");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the hand offers distinct characters, not a ranked list", () => {
  const root = makeRepo({
    "package.json": "{}\n",
    "arch-budget.json": '{"a.ts":2000,"b.ts":900,"c.ts":400}',
  });
  try {
    const out = forgeRun(root);
    const hand = out.slice(out.indexOf("YOUR MOVE"));
    assert.match(hand, /biggest threat/);
    assert.match(hand, /quickest win/);
    assert.match(hand, /Light the dark/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the spec gap is marked as a prerequisite for the big decomposition", () => {
  // Decomposing what nothing asserts on is the dangerous order — the forge has to say so.
  const root = makeRepo({
    "package.json": "{}\n",
    "arch-budget.json": '{"big.ts":1500}',
    "spec-gap-budget.json": '{"untested":9}',
  });
  try {
    const out = forgeRun(root);
    assert.match(out, /fight this BEFORE The Colossus/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a clean, fully-measured repo says so instead of inventing a fight", () => {
  const root = makeRepo({
    "package.json": "{}\n",
    "arch-budget.json": "{}",
    "dupe-budget.json": '{"duplicateDefs":0}',
    "dead-budget.json": "{}",
    "spec-gap-budget.json": '{"untested":0}',
    "clone-budget.json": '{"clones":0}',
    "docs/LESSONS.md": "# Lessons\n",
  });
  try {
    const out = forgeRun(root);
    assert.match(out, /nothing here to fight/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

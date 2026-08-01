import assert from "node:assert/strict";
import { test } from "node:test";
import {
  descriptor,
  isExcluded,
  readBudget,
  relTo,
  walkFiles,
  writeBudget,
} from "../plugins/harness-gates/lib/descriptor.mjs";
import { makeRepo } from "./helpers.mjs";

// The preamble six scanners share. It was six copies until a comment claiming standalone
// executables "must not import across that boundary" was tested and turned out to be false —
// `harness-claim` had been importing a sibling since the day it was written. The copies are the
// reason `spec-gap-scan` silently ignored the `exclude` key that two other scanners honoured.

test("a repo with no harness.json gets the documented defaults", () => {
  const d = descriptor(makeRepo({}));
  assert.equal(d.sourceDir, "src");
  assert.equal(d.testDir, "tests");
  assert.equal(d.sourceExt, ".ts");
  assert.deepEqual(d.exclude, []);
});

test("a declared key overrides the default, undeclared keys keep it", () => {
  const d = descriptor(makeRepo({ "harness.json": '{"sourceDir":"lib"}' }));
  assert.equal(d.sourceDir, "lib");
  assert.equal(d.testDir, "tests", "an undeclared key must still take its default");
});

test("a malformed harness.json falls back rather than crashing", () => {
  // A gate that dies on a typo in config is a gate the adopter turns off.
  assert.equal(descriptor(makeRepo({ "harness.json": "{ not json" })).sourceDir, "src");
});

test("walkFiles finds matching files at any depth", () => {
  const root = makeRepo({ "src/a.ts": "", "src/deep/b.ts": "", "src/c.md": "" });
  const found = walkFiles(`${root}/src`, (n) => n.endsWith(".ts")).map((f) => relTo(root, f));
  assert.deepEqual(found.sort(), ["src/a.ts", "src/deep/b.ts"]);
});

test("walkFiles treats a missing directory as empty, not an error", () => {
  // A repo with no test tree yet is the FINDING — everything is a gap — not a crash.
  assert.deepEqual(walkFiles(`${makeRepo({})}/tests`, () => true), []);
});

test("isExcluded matches declared prefixes only", () => {
  const desc = { exclude: ["src/templates/"] };
  assert.equal(isExcluded(desc, "src/templates/a.ts"), true);
  assert.equal(isExcluded(desc, "src/template-engine.ts"), false, "a prefix is not a substring");
  assert.equal(isExcluded({}, "src/a.ts"), false, "no declaration excludes nothing");
});

test("readBudget grandfathers a repo that has never frozen one", () => {
  assert.deepEqual(readBudget(makeRepo({}), "arch", { fallback: true }), { fallback: true });
});

test("writeBudget carries the recorded justification for a raise", () => {
  // `_`-prefixed keys are prose, not numbers. A rewrite that drops them destroys the one thing a
  // future maintainer needs to judge whether a raise is still earned — and nothing would fail.
  const root = makeRepo({ "arch-budget.json": '{"_why":"raised on purpose","src/a.ts":9}' });
  writeBudget(root, "arch", { "src/a.ts": 4 });
  const after = readBudget(root, "arch", {});
  assert.equal(after._why, "raised on purpose");
  assert.equal(after["src/a.ts"], 4);
});

test("writeBudget can sort its keys, and the prose sorts first", () => {
  const root = makeRepo({});
  writeBudget(root, "arch", { "src/z.ts": 1, "src/a.ts": 2, _why: "note" }, { sort: true });
  assert.deepEqual(Object.keys(readBudget(root, "arch", {})), ["_why", "src/a.ts", "src/z.ts"]);
});

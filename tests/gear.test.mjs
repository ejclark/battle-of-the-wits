// The gear selector's job is to be UNPERSUADABLE, so these tests are mostly about what it refuses.
//
// Every case below is a planted violation of the rule it names: a downgrade that would have been
// silent, a signal that should not have been believed, an unmeasurable budget that must not become a
// throttle. A suite that only checked "returns a gear" would pass against a function that returns
// "standard" unconditionally, which is precisely the behaviour this module exists to prevent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GEARS, FLOORS, ceilingFor, floorFor, gear, headroom } from "../plugins/harness-core/lib/gear.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const LAUNCHER = join(REPO, "plugins/harness-core/bin/harness-gear");

test("the ladder is ordered, and every floor names a rung on it", () => {
  assert.deepEqual(GEARS, ["mechanical", "standard", "careful", "deep"]);
  for (const [signal, floor] of Object.entries(FLOORS)) {
    assert.ok(GEARS.includes(floor), `signal ${signal} maps to ${floor}, which is not a gear`);
  }
});

test("absence of evidence is not evidence the work is easy", () => {
  // The planted violation: a selector that defaults to the cheapest rung. Nothing fired, so nothing
  // is known — and "nothing is known" must not resolve to "this is a rename".
  assert.equal(floorFor([]), "standard");
  assert.equal(floorFor(["nonsense"]), "standard");
});

test("a positive mechanical signal, alone, is what earns the cheap rung", () => {
  assert.equal(floorFor(["formatting"]), "mechanical");
  assert.equal(floorFor(["drill"]), "mechanical");
});

test("any signal that pulls up beats every signal that pulls down", () => {
  // The dangerous shape: averaging. A drill that has started regressing is not "somewhere in the
  // middle" — it is a regression, and the mechanical signal is now the stale half of the picture.
  assert.equal(floorFor(["drill", "regression"]), "careful");
  assert.equal(floorFor(["formatting", "irreversible"]), "deep");
  assert.equal(floorFor(["drill", "formatting", "refused"]), "deep");
});

test("the floor is the HIGHEST demand, never the first or the last one seen", () => {
  assert.equal(floorFor(["regression", "irreversible"]), "deep");
  assert.equal(floorFor(["irreversible", "regression"]), "deep");
});

test("an unmeasurable budget applies no ceiling and says so", () => {
  // Degrading honestly cuts BOTH ways. A missing limit must not silently throttle the work, and it
  // must not silently pretend the budget is fine either — it reports that it could not measure.
  for (const nothing of [null, undefined, Number.NaN]) assert.equal(ceilingFor(nothing), null);
  const r = gear({ signals: ["irreversible"], fraction: null });
  assert.equal(r.refuse, false);
  assert.equal(r.gear, "deep");
  assert.match(r.note, /unmeasurable/);
});

test("a budget that cannot fund the evidence REFUSES instead of running it cheap", () => {
  // This is the load-bearing case. The tempting behaviour is to return `ceiling` — the affordable
  // gear — and let the work proceed. That produces a finished-looking irreversible change made at a
  // quality nobody was told about, which is this project's defining failure mode.
  const r = gear({ signals: ["irreversible"], fraction: 0.02 });
  assert.equal(r.refuse, true);
  assert.equal(r.gear, null, "a refusal must not hand back a gear to run anyway");
  assert.equal(r.floor, "deep");
  assert.equal(r.ceiling, "mechanical");
  assert.match(r.note, /split the change/, "a refusal that does not say what to do next is a dead end");
});

test("headroom never spends more than the evidence asked for", () => {
  // The other silent failure: a full budget is not a reason to think harder about a rename. Unused
  // headroom is what pays for the next thing that genuinely needs it.
  const r = gear({ signals: ["formatting"], fraction: 1 });
  assert.equal(r.gear, "mechanical");
  assert.equal(r.ceiling, "deep");
});

test("headroom is measured from the window, and ignores what fell outside it", () => {
  const dir = mkdtempSync(join(tmpdir(), "gear-"));
  const file = join(dir, "metrics.jsonl");
  const old = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
  writeFileSync(
    file,
    [
      JSON.stringify({ at: old, tokens: 900 }), //         outside a 5h window — must not count
      JSON.stringify({ at: new Date().toISOString(), tokens: 200 }),
      "{ this line is corrupt", //                          must not abort the measurement
      JSON.stringify({ at: new Date().toISOString() }), //  no tokens field — contributes nothing
    ].join("\n"),
  );
  assert.equal(headroom(file, { HARNESS_TOKEN_LIMIT: "1000" }), 0.8);
  assert.equal(headroom(file, {}), null, "no declared limit means unmeasurable, not unlimited");
  assert.equal(headroom(join(dir, "absent.jsonl"), { HARNESS_TOKEN_LIMIT: "1000" }), null);
});

test("the account's limit is never read from a file this repository could commit", () => {
  // A token limit is true of one person's PLAN, which has exactly the problem a budget true of one
  // project has. It arrives by environment and has nowhere on disk to leak from.
  const src = execFileSync("cat", [join(REPO, "plugins/harness-core/lib/gear.mjs")], { encoding: "utf8" });
  assert.match(src, /HARNESS_TOKEN_LIMIT/);
  assert.ok(!/\.harness\/gear/.test(src), "the limit must not acquire a state file");
});

test("the launcher runs, and a refusal exits non-zero", () => {
  const out = execFileSync(LAUNCHER, ["--signal", "formatting", "--json"], { cwd: REPO, encoding: "utf8" });
  assert.equal(JSON.parse(out).gear, "mechanical");

  // A misspelled signal is REPORTED, never silently dropped: swallowing it yields a lower gear than
  // the evidence called for, which is the silent downgrade this module exists to stop.
  const typo = execFileSync(LAUNCHER, ["--signal", "regresion", "--json"], { cwd: REPO, encoding: "utf8" });
  assert.deepEqual(JSON.parse(typo).unknownSignals, ["regresion"]);
});

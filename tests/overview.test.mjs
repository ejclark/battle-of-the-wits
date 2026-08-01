// The overview is a READ surface, and the only thing that makes one worth having is that it is
// willing to say something you did not want to hear.
//
// The first thing this repository's own overview reported about itself was that eleven budget moves
// had all gone UP and not one had come down. That is the number that changes behaviour, and a
// dashboard that had rounded it into "6 gates active ✓" would have been strictly worse than no
// dashboard — it would have cost the reader the one fact worth knowing and charged them attention
// for it.
//
// So these tests are mostly about refusing to flatter: unlit is not zero, four data points are not a
// trend, and nothing here describes a person.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gateStates, overviewDocument, trend } from "../plugins/harness-core/lib/overview.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

const scratch = (files = {}) => {
  const d = mkdtempSync(join(tmpdir(), "overview-"));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(d, rel)), { recursive: true });
    writeFileSync(join(d, rel), body);
  }
  return d;
};

test("a gate with no budget reads as UNLIT, never as zero", () => {
  // The distinction the whole project rests on. "We have not measured this" and "this is clean" are
  // different states, and a dashboard that renders the first as the second is the false green with a
  // stylesheet on it.
  const bare = scratch({ "package.json": "{}" });
  const g = gateStates(bare);
  assert.equal(g.length, 6, "all six dimensions must appear even when none is frozen");
  assert.ok(g.every((x) => x.lit === false), "nothing is frozen here");
  assert.ok(g.every((x) => x.budget === null), "an unfrozen budget is null, not 0");

  const doc = overviewDocument(bare, "bare");
  assert.match(doc, /Unlit is not zero/, "the page must say it, not just encode it");
  assert.doesNotMatch(doc, /0 gates? lit.*✓|all clear/i, "an unmeasured repo must never render as clean");
});

test("direction is refused below the floor, rather than drawn from noise", () => {
  // An arrow drawn from four data points is lying with a picture. The honest output is "not enough
  // history", which is useless-looking and correct.
  const thin = scratch({ "docs/metrics.jsonl": [1, 2, 3].map((i) => JSON.stringify({ at: "2026-01-0" + i, kind: "ratchet", direction: "down", delta: 5 })).join("\n") });
  const t = trend(thin);
  assert.equal(t.readable, false, "3 ratchets is not a trend");
  assert.match(overviewDocument(thin, "thin"), /not enough history/);

  const enough = scratch({
    "docs/metrics.jsonl": Array.from({ length: 12 }, (_, i) => JSON.stringify({ at: `2026-01-${String(i + 1).padStart(2, "0")}`, kind: "ratchet", direction: i < 9 ? "down" : "up", delta: 4 })).join("\n"),
  });
  const e = trend(enough);
  assert.equal(e.readable, true);
  assert.equal(e.down, 9);
  assert.equal(e.up, 3);
  assert.match(overviewDocument(enough, "enough"), /paying down/);
});

test("it says 'negotiating' when every move has been a raise", () => {
  // This repository's real state at the time of writing, and the reason the view is worth having.
  // A raise is legitimate — each one carries a written reason — and a ratchet that has only ever
  // gone one way is a ratchet in name. The page has to be able to say that.
  const oneway = scratch({
    "docs/metrics.jsonl": Array.from({ length: 11 }, () => JSON.stringify({ kind: "ratchet", direction: "up", delta: 9 })).join("\n"),
  });
  const doc = overviewDocument(oneway, "oneway");
  assert.match(doc, /negotiating/);
  assert.match(doc, /ratchet in name/, "the uncomfortable sentence is the point — do not soften it away");
});

test("nothing on the page describes a person", () => {
  // The data is in git and assembling it would take twenty lines, which is exactly why the refusal
  // has to be deliberate. A dashboard that ranks people changes what people do, toward whatever is
  // being counted.
  const src = readFileSync(join(REPO, "plugins/harness-core/lib/overview.mjs"), "utf8");
  for (const forbidden of [/git.*shortlog/, /--author/, /"author"/, /committer/, /\bcontributors\b/]) {
    assert.ok(!forbidden.test(src), `overview.mjs reaches for ${forbidden} — this surface describes the CODE`);
  }
  assert.match(overviewDocument(REPO, "self"), /describes the code/i, "it must say so on the page, where a reader can hold it to it");
});

test("a corrupt ledger line costs one record, not the whole reading", () => {
  const messy = scratch({
    "docs/metrics.jsonl": ['{"kind":"ratchet","direction":"down","delta":3}', "{ not json", '{"kind":"incident"}'].join("\n"),
  });
  const t = trend(messy);
  assert.equal(t.records, 2, "the good lines must survive the bad one");
  assert.deepEqual(t.kinds, { ratchet: 1, incident: 1 });
});

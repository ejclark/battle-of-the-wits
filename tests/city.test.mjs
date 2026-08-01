import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { cityDocument } from "../plugins/harness-core/lib/city.mjs";
import { districts, repoModel } from "../plugins/harness-core/lib/model.mjs";
import { assertDocument, assertStandalone, bin, makeRepo, runTool } from "./helpers.mjs";

// Rung two of the visual ladder, and the rule that makes a ladder possible at all: **a rung is a new
// VIEW, never a new source of truth.** The moment a renderer decides for itself what a "big file"
// is, the map and the city start disagreeing and both start flattering the repository — the exact
// failure the gates exist to prevent, reintroduced as decoration.
//
// So the cases split in two: what the MODEL derives (which must match the budgets on disk), and what
// the VIEW promises (a real document, standalone, escaped, and honest about what it cannot see).

/** A repo with three districts, one file deliberately over its budget and one deliberately near it. */
function town() {
  const root = makeRepo({ "harness.json": '{"sourceDir":"src","sourceExt":".ts"}' });
  const files = {
    "src/engine/cycle.ts": 640,
    "src/engine/clock.ts": 70,
    "src/ui/chart.ts": 320,
    "src/domain/money.ts": 61,
  };
  for (const [path, lines] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), "x\n".repeat(lines - 1));
  }
  writeFileSync(
    join(root, "arch-budget.json"),
    JSON.stringify({ "src/engine/cycle.ts": 300, "src/engine/clock.ts": 120, "src/ui/chart.ts": 400 }),
  );
  return root;
}

test("districts are the repo's own top-level directories, not an imposed grouping", () => {
  const d = districts(town()).map((x) => x.name).sort();
  assert.deepEqual(d, ["domain", "engine", "ui"]);
});

test("a building's state comes from the committed budget, never from a guess", () => {
  const byName = Object.fromEntries(
    districts(town()).flatMap((d) => d.buildings.map((b) => [b.name, b])),
  );
  assert.equal(byName["cycle.ts"].state, "over", "640 lines against a 300 budget is over");
  assert.equal(byName["chart.ts"].state, "watch", "320 lines within a 400 budget is large but legal");
  assert.equal(byName["clock.ts"].state, "ok");
  assert.equal(byName["money.ts"].cap, 500, "a file with no budget entry takes the default cap");
});

test("the descriptor's exclusions are not part of the city", () => {
  const root = makeRepo({ "harness.json": '{"sourceDir":"src","sourceExt":".ts","exclude":["src/generated/"]}' });
  mkdirSync(join(root, "src/generated"), { recursive: true });
  mkdirSync(join(root, "src/real"), { recursive: true });
  writeFileSync(join(root, "src/generated/big.ts"), "x\n".repeat(900));
  writeFileSync(join(root, "src/real/a.ts"), "x\n");
  assert.deepEqual(districts(root).map((d) => d.name), ["real"]);
});

test("the written page is a complete HTML document", () => {
  const html = cityDocument(town(), "probe");
  assertDocument(assert, html);
});

test("it is standalone — no external stylesheet, script, font, or image", () => {
  // The promise the file makes: opens from disk, survives being emailed, renders under a strict CSP.
  const html = cityDocument(town(), "probe");
  assertStandalone(assert, html);
});

test("an over-budget file is drawn as such AND counted in the ledger", () => {
  // Both halves matter: the picture is what you see first, the table is what you act on.
  const html = cityDocument(town(), "probe");
  assert.match(html, /class="b over"/, "the tower must carry the over-budget class");
  assert.match(html, /class="bad">1</, "and the district's row must count it");
  assert.match(html, /<strong>1<\/strong> building is over budget/);
});

test("counts are pluralised — copy a person reads is part of the deliverable", () => {
  const root = makeRepo({ "harness.json": '{"sourceDir":"src","sourceExt":".ts"}' });
  mkdirSync(join(root, "src/lib"), { recursive: true });
  writeFileSync(join(root, "src/lib/a.ts"), "x\n");
  assert.match(cityDocument(root, "probe"), /1 source file across 1 district\./);
});

test("a district with nothing over budget says so plainly", () => {
  const root = makeRepo({ "harness.json": '{"sourceDir":"src","sourceExt":".ts"}' });
  mkdirSync(join(root, "src/lib"), { recursive: true });
  writeFileSync(join(root, "src/lib/a.ts"), "x\n");
  assert.match(cityDocument(root, "probe"), /Nothing is over budget/);
});

// `< >` are legal in a POSIX path and forbidden by Win32/NTFS, so the one input that stages this —
// a directory literally named `<script>` — cannot be created on Windows at all. The escaping under
// test lives in cityDocument and is platform-independent; skip only the staging that the filesystem
// refuses, rather than pretend the case ran.
test("file and district names are escaped — they are untrusted input", { skip: process.platform === "win32" && "NTFS forbids < > in filenames — the input cannot be staged here" }, () => {
  const root = makeRepo({ "harness.json": '{"sourceDir":"src","sourceExt":".ts"}' });
  mkdirSync(join(root, "src/<script>"), { recursive: true });
  writeFileSync(join(root, "src/<script>/a.ts"), "x\n");
  const html = cityDocument(root, "probe");
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("a repository with no source tree renders rather than crashing", () => {
  // The first run in a fresh repo is exactly when a tool must not fail.
  const html = cityDocument(makeRepo({}), "probe");
  assert.match(html, /^<!doctype html>/i);
  assert.ok(html.length > 500);
});

test("dimensions the repo cannot measure are declared, never rendered as zero", () => {
  // A city with no dark quarters would be a lie, and false green is what the whole harness exists
  // to prevent. An unlit dimension has to survive all the way to the picture.
  const html = cityDocument(town(), "probe");
  assert.match(html, /unlit: duplication/);
  assert.match(html, /unlit: the spec gap/);
});

test("the model the city draws is the same one the map reads", () => {
  // The load-bearing constraint of the whole ladder. If these ever diverge, two pictures of one
  // repository start disagreeing and both become untrustworthy.
  const model = repoModel(town());
  assert.ok(Array.isArray(model.districts));
  assert.ok(Array.isArray(model.rooms), "ADRs — what the map calls cleared rooms");
  assert.ok(Array.isArray(model.bosses), "budgets — what the map calls bosses standing");
  assert.ok(Array.isArray(model.unlit), "and what neither can see");
});

test("the launcher writes where it is told", () => {
  const root = town();
  const out = join(root, "elsewhere.html");
  const r = runTool(bin("harness-core", "harness-city"), root, ["--out", out]);
  assert.equal(r.code, 0, r.out);
  assert.match(readFileSync(out, "utf8"), /^<!doctype html>/i);
});

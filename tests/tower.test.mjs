import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { repoModel } from "../plugins/harness-core/lib/model.mjs";
import { dimensionStanding, unlitDimensions } from "../plugins/harness-core/lib/state.mjs";
import { tierPlan, towerDocument, towerSolid } from "../plugins/harness-core/lib/tower.mjs";
import { assertDocument, assertStandalone, bin, makeRepo, runTool } from "./helpers.mjs";

// Rung three of the visual ladder, and the one whose subject is the harness itself: the first two
// rungs draw what a repository CONTAINS, and this draws how much of it is under measurement. The
// difference matters for what has to be tested. A city that silently omitted an unlit dimension
// would still be a fair picture of the files; a tower that did it would be a picture of coverage
// claiming full coverage, which is the false green this whole project exists to prevent.
//
// So the cases split three ways: what the PLAN derives from the model, what the SOLID does with it,
// and what the DOCUMENT promises. Nothing here asserts a colour or a sentence, because a correct
// change to either should not turn this file red — the assertions are on the aperture opening as
// coverage rises, on the stack ordering, and on the unlit half surviving all the way to the page.

/** Districts of deliberately uneven weight, one file over budget, and every dimension dark but one. */
function keep() {
  const root = makeRepo({
    "harness.json": '{"sourceDir":"src","sourceExt":".ts"}',
    "arch-budget.json": JSON.stringify({ "src/engine/cycle.ts": 300, "src/ui/chart.ts": 400 }),
  });
  for (const [path, lines] of Object.entries({
    "src/engine/cycle.ts": 640,
    "src/engine/clock.ts": 70,
    "src/ui/chart.ts": 320,
    "src/domain/money.ts": 61,
  })) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), "x\n".repeat(lines - 1));
  }
  return root;
}

/** The same keep, with every dimension's evidence committed — the fully-watched end of the range. */
function watchedKeep() {
  const root = keep();
  for (const f of ["dupe-budget.json", "dead-budget.json", "spec-gap-budget.json", "clone-budget.json"]) {
    writeFileSync(join(root, f), "{}");
  }
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "docs/LESSONS.md"), "# lessons\n");
  return root;
}

const irisRadius = (html) => Number(html.match(/class="iris"[^/]*r="([\d.]+)"/)[1]);

test("the six dimensions are one table — the ids and the labels cannot drift apart", () => {
  // These used to be two parallel lists in the same file, in the same order, with nothing keeping
  // them in step. Adding a seventh dimension to one and not the other is a one-line omission that
  // no test would have caught, and the symptom is a count of six against a list of seven.
  const standing = dimensionStanding(keep());
  assert.equal(standing.length, 6);
  for (const d of standing) {
    assert.ok(d.id && d.label && d.evidence && d.fix, `${d.id} is missing part of its row`);
  }
  // And the derived view must still agree with the one the map and the forge already consume.
  assert.deepEqual(
    unlitDimensions(keep()).map((d) => d.label),
    standing.filter((d) => !d.lit).map((d) => d.label),
  );
});

test("tiers stack heaviest at the base, and the stack is contiguous", () => {
  const plan = tierPlan(repoModel(keep()));
  assert.deepEqual(plan.map((t) => t.district.name), ["engine", "ui", "domain"]);
  for (const [i, tier] of plan.entries()) {
    assert.ok(tier.y1 > tier.y0, "a tier must have height");
    if (i) assert.equal(tier.y0, plan[i - 1].y1, "a floating tier is a tower that is not standing");
    if (i) assert.ok(tier.lower <= plan[i - 1].lower, "and it must not overhang the one below it");
  }
});

test("a tier's standing is the WORST of its files, never an average of them", () => {
  // Averaging would let one breach be diluted into a pleasant colour by the size of the district
  // around it — the picture flattering the codebase, which the ladder's founding rule forbids.
  const byName = Object.fromEntries(tierPlan(repoModel(keep())).map((t) => [t.district.name, t.state]));
  assert.equal(byName.engine, "over", "one file over budget among two makes the tier breached");
  assert.equal(byName.ui, "watch");
  assert.equal(byName.domain, "ok");
});

test("the solid is closed — every face has area, and none of it is NaN", () => {
  const { faces, height } = towerSolid(tierPlan(repoModel(keep())));
  assert.ok(faces.length > 0);
  assert.ok(height > 0);
  for (const f of faces) {
    assert.ok(f.points.length >= 3, "a face needs at least three points");
    for (const p of f.points) {
      assert.ok(p.every(Number.isFinite), `NaN reached the geometry: ${JSON.stringify(f.points)}`);
    }
  }
});

test("the aperture opens as coverage rises — that is the whole rung", () => {
  // The load-bearing claim of this view, asserted on the GEOMETRY rather than on the sentence that
  // describes it, so rewording the page cannot make it pass vacuously.
  const dark = towerDocument(keep(), "probe");
  const lit = towerDocument(watchedKeep(), "probe");
  assert.ok(irisRadius(lit) > irisRadius(dark), "a repository measuring more must draw a wider Eye");
  // …and it must not close to literally nothing, which is indistinguishable from a broken render.
  assert.ok(irisRadius(dark) > 0);
});

test("an unlit dimension survives to the page, with the command that lights it", () => {
  // A finding that travels without its fix is half a finding — the rule the map and forge already
  // keep. Here it is the difference between a picture of coverage and an accusation.
  const html = towerDocument(keep(), "probe");
  for (const d of unlitDimensions(keep())) {
    assert.ok(html.includes(d.label), `${d.label} is unlit and is not named on the page`);
    assert.ok(html.includes(d.fix), `${d.label} is named without the command that lights it`);
  }
});

test("a fully measured repository says so, rather than inventing something to worry about", () => {
  const html = towerDocument(watchedKeep(), "probe");
  assert.match(html, /6 of 6 dimensions/);
  assert.doesNotMatch(html, /UNLIT/);
});

test("an over-budget file breaches its tier, in the picture AND in the ledger", () => {
  // Both halves matter for the same reason they do one rung down: the picture is what you see
  // first, the table is what you act on.
  const html = towerDocument(keep(), "probe");
  assert.match(html, /class="tier over"/, "the tier must carry the breached class");
  assert.match(html, /class="breach">1</, "and its row must count it");
});

test("the written page is a complete HTML document", () => {
  assertDocument(assert, towerDocument(keep(), "probe"));
});

test("it is standalone — no external stylesheet, script, font, or image", () => {
  // The promise every rung makes: opens from disk, survives being emailed, renders under a strict
  // CSP. A 3D rung is exactly where that promise is easiest to drop, because the obvious way to
  // draw a solid in a browser needs a canvas and a script. This rung projects in Node instead.
  assertStandalone(assert, towerDocument(keep(), "probe"));
});

test("the layout comes from the descriptor, never from an assumption about it", () => {
  // Portability, at the only place this view can get it wrong. A renderer that hardcodes `src/`
  // draws an empty tower for a repository that keeps its source somewhere else — and an empty
  // tower is not an error, it is a false green with a picture attached.
  const root = makeRepo({ "harness.json": '{"sourceDir":"lib","sourceExt":".js"}' });
  mkdirSync(join(root, "lib/parser"), { recursive: true });
  writeFileSync(join(root, "lib/parser/lex.js"), "x\n".repeat(40));
  assert.deepEqual(tierPlan(repoModel(root)).map((t) => t.district.name), ["parser"]);
  assert.match(towerDocument(root, "probe"), /parser/);
});

test("names from the repository are escaped — they are untrusted input", { skip: process.platform === "win32" && "NTFS forbids < > in filenames — the input cannot be staged here" }, () => {
  const root = makeRepo({ "harness.json": '{"sourceDir":"src","sourceExt":".ts"}' });
  mkdirSync(join(root, "src/<script>"), { recursive: true });
  writeFileSync(join(root, "src/<script>/a.ts"), "x\n");
  const html = towerDocument(root, "probe");
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("a repository with no source tree renders a foundation, and says why", () => {
  // The first run in a fresh repo is exactly when a tool must not fail — and the honest picture of
  // a repository nobody has built on is a plinth under an Eye, not an exception.
  const html = towerDocument(makeRepo({}), "probe");
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /no source tree/i, "an empty frame with no explanation is a dead end");
  assert.ok(html.length > 500);
});

test("the model the tower draws is the same one the map and the city read", () => {
  // The load-bearing constraint of the whole ladder. Three renderings of one repository that could
  // disagree would leave a reader with no way to tell which one was lying.
  const model = repoModel(keep());
  assert.ok(Array.isArray(model.districts));
  assert.ok(Array.isArray(model.unlit), "what none of the rungs can see");
  assert.ok(Array.isArray(model.standing), "…and the denominator coverage needs");
  assert.equal(model.standing.filter((d) => !d.lit).length, model.unlit.length);
});

test("the launcher writes where it is told", () => {
  const root = keep();
  const out = join(root, "elsewhere.html");
  const r = runTool(bin("harness-core", "harness-tower"), root, ["--out", out]);
  assert.equal(r.code, 0, r.out);
  assert.match(readFileSync(out, "utf8"), /^<!doctype html>/i);
});

// The history view reads a budget's own past out of git. Its failure modes are all the same shape:
// drawing a line that looks like a fact and is not.
//
// So these tests build REAL repositories with PLANTED histories rather than asserting on this one.
// A view tested against the repo it ships in is tested against exactly one series, and the series it
// most needs to get right — a budget that went down, a budget with a gap in it, a repository with no
// git at all — are the ones this repo does not happen to contain.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { budgetSeries, history, historyDocument, sparkline, verdict, WINDOW } from "../plugins/harness-core/lib/history.mjs";
import { budgetTotal } from "../plugins/harness-core/lib/state.mjs";
import { codeOf } from "./helpers.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

/** A throwaway repository whose history is exactly the budgets handed in, one commit each. */
function planted(commits, { init = true } = {}) {
  const d = mkdtempSync(join(tmpdir(), "history-"));
  const git = (...args) => execFileSync("git", args, { cwd: d, stdio: "ignore" });
  if (init) {
    git("init", "-q");
    git("config", "user.email", "t@example.com");
    git("config", "user.name", "T");
  }
  for (const [i, files] of commits.entries()) {
    for (const [rel, body] of Object.entries(files)) {
      mkdirSync(dirname(join(d, rel)), { recursive: true });
      writeFileSync(join(d, rel), typeof body === "string" ? body : JSON.stringify(body));
    }
    if (init) {
      git("add", "-A");
      git("commit", "-q", "-m", `commit ${i}`);
    }
  }
  return d;
}

test("a budget's series comes back oldest-first, with the total at each commit", () => {
  const root = planted([
    { "arch-budget.json": { "a.mjs": 300 } },
    { "arch-budget.json": { "a.mjs": 280, "b.mjs": 40 } },
    { "arch-budget.json": { "a.mjs": 250, "b.mjs": 40 } },
  ]);
  const s = budgetSeries(root, "arch");
  assert.equal(s.tracked, true);
  assert.deepEqual(
    s.points.map((p) => p.total),
    [300, 320, 290],
    "oldest first — a series rendered newest-first draws every trend backwards",
  );
  assert.ok(
    s.points.every((p) => /^[0-9a-f]{7}$/.test(p.sha) && /^\d{4}-\d\d-\d\d$/.test(p.date)),
    "every point carries the commit it was read from, so a number on the page can be checked",
  );
});

test("it totals a budget exactly the way the overview does", () => {
  // The one invariant that makes this view safe to read next to the overview. Two readers that
  // disagree about what a file totals render a move that never happened.
  assert.equal(budgetTotal({ "a.mjs": 10, "b.mjs": 5 }), 15);
  assert.equal(budgetTotal({ "a.mjs": 10, _why_a: "a paragraph" }), 10, "_why keys are prose, not debt");
  assert.equal(budgetTotal(7), 7, "the bare-number shape is in the wild too");
  assert.equal(budgetTotal(null), null, "unreadable must not arrive downstream as 0");

  const root = planted([{ "arch-budget.json": { "a.mjs": 10, _why_a: "because", "b.mjs": 5 } }]);
  assert.equal(budgetSeries(root, "arch").points.at(-1).total, 15);
});

test("a budget that was never committed reads as UNTRACKED, never as a flat line at zero", () => {
  // The same distinction the overview rests on, one level down. "This repository has no history for
  // this gate" and "this gate has held steady" are different facts, and a chart that renders the
  // first as the second is the false green with a stylesheet on it.
  const root = planted([{ "arch-budget.json": { "a.mjs": 5 } }]);
  const s = history(root);
  const arch = s.find((x) => x.gate === "arch");
  const clone = s.find((x) => x.gate === "clone");
  assert.equal(arch.tracked, true);
  assert.equal(clone.tracked, false);
  assert.deepEqual(clone.points, [], "no commits means no points, not a zero");

  const doc = historyDocument(root, "acme", { series: s });
  assert.match(doc, /Unlit is not zero/);
  assert.match(doc, /clone-budget\.json/, "the page must name which budgets it has no history for");
  assert.doesNotMatch(
    doc.replace(/[\s\S]*No history/, ""),
    /clone<\/h2>/,
    "an untracked gate must not also get a chart card",
  );
});

test("a directory that is not a repository is a state, and never an exception", () => {
  const bare = planted([{ "arch-budget.json": { "a.mjs": 5 } }], { init: false });
  assert.doesNotThrow(() => history(bare));
  assert.ok(history(bare).every((s) => s.tracked === false), "no git means no readings — degrade, do not guess");
  assert.doesNotThrow(() => historyDocument(bare, "acme"));
  assert.doesNotThrow(() => history("/nonexistent-path-for-this-test"));
});

test("a commit where the budget was unreadable is a GAP, not a zero", () => {
  // Planted because it happens: a budget half-written by a crashed scanner, or a merge conflict
  // committed by accident. Scoring that commit as 0 draws a cliff to the floor and back.
  const root = planted([
    { "arch-budget.json": { "a.mjs": 300 } },
    { "arch-budget.json": "{ this is not json" },
    { "arch-budget.json": { "a.mjs": 290 } },
  ]);
  const totals = budgetSeries(root, "arch").points.map((p) => p.total);
  assert.deepEqual(totals, [300, null, 290]);
  assert.match(historyDocument(root, "acme"), /—/, "an unreadable reading renders as a dash");
  // And the line skips it rather than plunging through it.
  assert.doesNotMatch(sparkline([{ total: 300 }, { total: null }, { total: 290 }]), /NaN/);
});

test("the verdict says which way it went, and refuses to call one point a trend", () => {
  const down = { points: [{ total: 300, date: "2026-01-01" }, { total: 250, date: "2026-02-01" }] };
  const up = { points: [{ total: 250, date: "2026-01-01" }, { total: 300, date: "2026-02-01" }] };
  assert.equal(verdict(down).tone, "good");
  assert.match(verdict(down).label, /down 50/);
  assert.equal(verdict(up).tone, "warn");
  assert.match(verdict(up).label, /up 50/);
  assert.equal(verdict({ points: [{ total: 5, date: "2026-01-01" }] }).tone, "quiet");
  assert.match(verdict({ points: [{ total: 5, date: "2026-01-01" }] }).label, /never moved/);
  assert.equal(verdict({ points: [] }).tone, "quiet", "no readings is a verdict too");
  assert.equal(verdict({ points: [{ total: null }] }).label, "no readings");
});

test("the sparkline is baselined at zero, so a small move is not drawn as a cliff", () => {
  // A min-baselined sparkline turns 400 → 398 into a collapse. Technically drawn from real numbers,
  // and wrong about the only thing a reader takes from a picture.
  const flat = sparkline([{ total: 400 }, { total: 398 }]);
  const ys = [...flat.matchAll(/[ML]([\d.]+),([\d.]+)/g)].map((m) => Number(m[2]));
  assert.ok(Math.abs(ys[0] - ys[1]) < 2, `a 0.5% move must render as nearly flat, got ${ys}`);
  const cliff = sparkline([{ total: 400 }, { total: 4 }]);
  const cy = [...cliff.matchAll(/[ML]([\d.]+),([\d.]+)/g)].map((m) => Number(m[2]));
  assert.ok(cy[1] - cy[0] > 20, "a real collapse must still read as one");
  assert.equal(sparkline([{ total: 5 }]), "", "one point is not a line");
});

test("a long history is WINDOWED, and the page says so rather than pretending", () => {
  // A truncated series rendered as if it were the whole story is a picture that lies. No silent caps.
  // The WINDOW is injectable, so this plants 8 commits against a window of 5 rather than 43 against
  // the real one. Same property — a history longer than the bound is cut and says so — at a seventh
  // of the cost. Creating 43 real git commits to prove an off-by-one made this the slowest test in
  // the suite at ~6s, which is a toll every future run pays for nothing.
  const WIN = 5;
  const root = planted(Array.from({ length: WIN + 3 }, (_, i) => ({ "arch-budget.json": { "a.mjs": 500 - i } })));
  const s = budgetSeries(root, "arch", { window: WIN });
  assert.equal(s.points.length, WIN, "the walk is bounded");
  assert.ok(WINDOW > 0, "the shipped default is still a real bound");
  assert.equal(s.truncated, true);
  assert.match(historyDocument(root, "acme", { series: [s] }), /more history behind this window/i);

  const short = budgetSeries(planted([{ "arch-budget.json": 3 }]), "arch");
  assert.equal(short.truncated, false, "a history that fits must not claim to be cut");
});

test("nothing here describes a person", () => {
  // Git hands you an author on every log line and it costs one format specifier to render it. The
  // refusal has to be deliberate rather than incidental — see the dignity rule in CONTRIBUTORS.md.
  const src = codeOf(join(REPO, "plugins/harness-core/lib/history.mjs"));
  assert.doesNotMatch(src, /%an|%ae|%aN|%cn|%ce|--author/, "the log format must not read an author");

  const root = planted([{ "arch-budget.json": { "a.mjs": 5 } }, { "arch-budget.json": { "a.mjs": 4 } }]);
  const doc = historyDocument(root, "acme");
  assert.doesNotMatch(doc, /t@example\.com/, "the planted committer must not reach the page");
  assert.ok(
    budgetSeries(root, "arch").points.every((p) => !("author" in p) && !("email" in p)),
    "a point carries the commit, not the committer",
  );
});

test("every value that reaches the page is escaped", () => {
  // A commit subject is attacker-controlled the moment a branch is fetched from anywhere.
  const root = planted([{ "arch-budget.json": { "a.mjs": 5 } }]);
  execFileSync("git", ["commit", "-q", "--allow-empty", "--amend", "-m", "<img src=x onerror=alert(1)>"], {
    cwd: root,
    stdio: "ignore",
  });
  const doc = historyDocument(root, "acme");
  assert.doesNotMatch(doc, /<img src=x/, "a commit subject must not render as markup");
  assert.match(doc, /&lt;img src=x/);
});

test("it needs nothing installed", () => {
  const src = readFileSync(join(REPO, "plugins/harness-core/lib/history.mjs"), "utf8");
  for (const i of [...src.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1])) {
    assert.ok(i.startsWith("node:") || i.startsWith("./"), `history.mjs imports "${i}" — it must depend on nothing`);
  }
});

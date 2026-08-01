// The chassis is shared, which makes it the one file where a mistake reaches every view at once.
//
// It exists because the overview and the history view each carried a copy of the same stylesheet and
// the clone gate caught the second one immediately. Two pages that agree today and are edited apart
// do not agree for long, and nothing goes red when they drift — the reader just meets an application
// that is not quite finished.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CHASSIS, NAV, TOKENS, card, chip, page, tile } from "../plugins/harness-core/lib/shell.mjs";
import { overviewDocument } from "../plugins/harness-core/lib/overview.mjs";
import { historyDocument } from "../plugins/harness-core/lib/history.mjs";
import { handle } from "../plugins/harness-core/lib/serve.mjs";
import { codeOf } from "./helpers.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = [overviewDocument(REPO, "acme"), historyDocument(REPO, "acme")];

test("every view is built on the one chassis, not its own copy of it", () => {
  // The defect this file exists to prevent, asserted as a property rather than as a string: a view
  // that declares its own palette has forked the design system whatever it happens to name it.
  for (const doc of PAGES) {
    assert.ok(doc.includes("--accent:"), "a view must carry the shared tokens");
    const paletteBlocks = [...doc.matchAll(/--paper:/g)].length;
    assert.ok(paletteBlocks <= 4, `a view must not redeclare the palette beyond the token blocks, saw ${paletteBlocks}`);
  }
});

test("it needs nothing installed — no webfont, no CDN, no network at all", () => {
  // A face fetched from a CDN is an install wearing a stylesheet, and one that silently falls back is
  // the visual form of the false green: it renders, it looks deliberate, and it is not what was set.
  for (const doc of [...PAGES, page({ title: "t", repoName: "r", eyebrow: "e", body: "" })]) {
    assert.doesNotMatch(doc, /@import|fonts\.googleapis|fonts\.gstatic/i);
    assert.doesNotMatch(doc, /<link[^>]+stylesheet/i, "every style must be inline — the server has no asset route");
  }
  const src = codeOf(join(REPO, "plugins/harness-core/lib/shell.mjs"));
  assert.doesNotMatch(src, /https?:\/\//, "the chassis must not reference a remote host");
});

test("both themes are designed, and the viewer's toggle wins over the OS preference", () => {
  // The toggle stamps data-theme on the root, and it has to override prefers-color-scheme in BOTH
  // directions — a page that only handles dark is stuck for a reader whose OS says dark and who
  // asked for light.
  assert.match(TOKENS, /@media\(prefers-color-scheme:dark\)/);
  assert.match(TOKENS, /:root\[data-theme="dark"\]/);
  assert.match(TOKENS, /:root\[data-theme="light"\]/, "the light override must exist too, or the toggle is one-way");
  // And the dark theme must be re-picked rather than inverted: an accent reused across both grounds
  // is a switch being flipped instead of a colour being chosen.
  const values = (sel) => {
    const block = TOKENS.match(new RegExp(`${sel}\\{([^}]*)\\}`))[1];
    return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+)/g)].map((m) => [m[1], m[2].trim()]));
  };
  const d = values(':root\\[data-theme="dark"\\]');
  const l = values(':root\\[data-theme="light"\\]');
  assert.deepEqual(Object.keys(d).sort(), Object.keys(l).sort(), "both themes must define the same token set");
  assert.notEqual(d["--accent"], l["--accent"], "the accent must be re-picked for the dark ground, not reused");
  assert.notEqual(d["--good"], l["--good"], "semantic colour is re-picked for the dark ground too");
});

test("semantic colour is kept separate from the accent", () => {
  // Good/warning/critical answer "what state is this in"; the accent answers "what can I press". A
  // status that shares the accent's value stops meaning anything, and the page has nothing to point
  // with.
  const root = TOKENS.match(/:root\{([^}]*)\}/)[1];
  const v = Object.fromEntries([...root.matchAll(/(--[\w-]+):\s*([^;]+)/g)].map((m) => [m[1], m[2].trim()]));
  for (const semantic of ["--good", "--crit"]) {
    assert.notEqual(v[semantic], v["--accent"], `${semantic} must not be the accent`);
  }
});

test("every served view is in the nav, and the nav points at nothing that 404s", () => {
  // A view nobody can reach is a view nobody built — and a link to a route that does not exist is
  // worse, because it reads as something broken rather than something absent.
  for (const v of NAV) {
    assert.notEqual(handle(REPO, v.path).status, 404, `${v.path} is in the nav but the server does not serve it`);
  }
  for (const doc of PAGES) {
    for (const v of NAV) {
      assert.ok(doc.includes(`href="${v.path}"`), `${v.path} is served but not linked from every view`);
    }
  }
});

test("the current view is marked, so the nav says where you are", () => {
  assert.match(overviewDocument(REPO, "acme"), /<a href="\/" aria-current="page"/);
  assert.match(historyDocument(REPO, "acme"), /<a href="\/history" aria-current="page"/);
});

test("no project-specific value is baked into the chassis", () => {
  // The defect this replaced: the overview's eyebrow was the literal string "dungeon-crawler", so an
  // adopter's own dashboard announced THIS project's name above theirs. A value that has to be true
  // for one particular repository has no business in the harness — the one rule everything else
  // falls out of.
  const src = codeOf(join(REPO, "plugins/harness-core/lib/shell.mjs"));
  assert.doesNotMatch(src, /dungeon-crawler|skynet/i, "the chassis must not name a repository");
  const doc = overviewDocument(REPO, "acme");
  assert.doesNotMatch(doc.replace(/<title>[^<]*<\/title>/, ""), /dungeon-crawler/, "no view may hardcode a repo name");
  assert.match(doc, /<h1>acme<\/h1>/, "the name on the page is the one it was handed");
});

test("the document is well-formed enough not to open in quirks mode", () => {
  // Already fixed once in the map, which is exactly why the skeleton is shared now.
  for (const doc of PAGES) {
    assert.match(doc, /^<!doctype html>/i);
    assert.match(doc, /<html lang="en">/);
    assert.match(doc, /<meta name="viewport"/, "a tool that is unusable on a narrow window is unusable to somebody");
    assert.equal((doc.match(/<body>/g) ?? []).length, 1);
  }
});

test("wide content scrolls inside itself, never the page", () => {
  // A budget table is as wide as the longest file path in somebody's repository, which is not a
  // number this project gets to choose.
  assert.match(CHASSIS, /\.scroll\{overflow-x:auto\}/);
  for (const doc of PAGES) {
    for (const m of doc.matchAll(/<table>/g)) {
      const before = doc.slice(Math.max(0, m.index - 260), m.index);
      assert.match(before, /class="scroll"/, "every table must sit in its own horizontal scroll container");
    }
  }
});

test("motion is opt-out and focus is visible", () => {
  assert.match(CHASSIS, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(CHASSIS, /focus-visible/, "a keyboard user must be able to see where they are");
});

test("the primitives render what they are given and nothing else", () => {
  assert.match(tile("Gates", 6), /Gates/);
  assert.match(tile("Gates", 6, { tone: "warn", note: "two unlit" }), /tile warn[\s\S]*two unlit/);
  assert.match(card("Direction", "<p>body</p>", chip("good", "paying down")), /Direction[\s\S]*paying down[\s\S]*body/);
  assert.match(chip("crit", "over budget"), /class="chip crit"/);
});

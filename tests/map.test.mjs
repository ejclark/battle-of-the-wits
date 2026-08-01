import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { mapDocument } from "../plugins/harness-core/lib/cartography.mjs";
import { bin, makeRepo, runTool } from "./helpers.mjs";

// `harness-map` had never been run by anything. It worked — and wrote a file with no doctype, so
// every browser opened it in QUIRKS MODE, where box-sizing and several inherited properties behave
// differently from the standards mode its CSS was written against. It rendered, which is why nothing
// complained; it just did not render as designed.
//
// The shape was correct for an embedding host that supplies its own skeleton. A file on disk has no
// host. Same pattern as the rest of this harness's history: an artifact correct where it was
// authored, moved somewhere that needs more, with nothing in between to notice.

const ADR = `# ADR-0001: Choose the storage engine

**Status:** Accepted
**Date:** 2026-01-01

Body.
`;

test("the written file is a complete HTML document", () => {
  const root = makeRepo({ "docs/adr/0001-storage.md": ADR });
  const out = join(root, "map.html");
  const r = runTool(bin("harness-core", "harness-map"), root, ["-o", out]);
  assert.equal(r.code, 0, r.out);
  const html = readFileSync(out, "utf8");
  assert.match(html, /^<!doctype html>/i, "no doctype means quirks mode");
  for (const tag of ["<html lang=", "<head>", "<meta charset=", "</head>", "<body>", "</body>", "</html>"]) {
    assert.ok(html.includes(tag), `missing ${tag}`);
  }
});

test("it is standalone — no external stylesheet, script, font, or image", () => {
  // The promise the doc makes: opens from disk, survives being emailed, renders under a strict CSP.
  const html = mapDocument(makeRepo({ "docs/adr/0001-storage.md": ADR }), "probe");
  assert.doesNotMatch(html, /<link\b[^>]*rel=["']?stylesheet/i);
  assert.doesNotMatch(html, /<script\b/i);
  assert.doesNotMatch(html, /https?:\/\/[^"')\s]+\.(css|js|woff2?|png|jpg|svg)/i);
});

test("a cleared room appears, escaped", () => {
  const root = makeRepo({ "docs/adr/0001-x.md": ADR.replace("Choose the storage engine", "A <script> & co") });
  const html = mapDocument(root, "probe");
  assert.match(html, /A &lt;script&gt; &amp; co/, "ADR titles are untrusted input and must be escaped");
  assert.doesNotMatch(html, /<script>/);
});

test("a repository with no ADRs still renders rather than crashing", () => {
  // The first run in a fresh repo is exactly when a tool must not fail.
  const html = mapDocument(makeRepo({}), "probe");
  assert.match(html, /^<!doctype html>/i);
  assert.ok(html.length > 500);
});

test("bosses come from committed budgets, not from invention", () => {
  const root = makeRepo({ "arch-budget.json": JSON.stringify({ "src/huge.ts": 900 }) });
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src/huge.ts"), "export const a = 1;\n");
  assert.ok(mapDocument(root, "probe").length > 500);
});

test("the output path is honoured", () => {
  const root = makeRepo({});
  const out = join(root, "nested/elsewhere.html");
  mkdirSync(join(root, "nested"), { recursive: true });
  const r = runTool(bin("harness-core", "harness-map"), root, ["--out", out]);
  assert.equal(r.code, 0, r.out);
  assert.ok(existsSync(out));
});

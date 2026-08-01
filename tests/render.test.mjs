import assert from "node:assert/strict";
import { basename } from "node:path";
import { test } from "node:test";
import { isAbsolute } from "node:path";
import { esc, outPath, repoNameOf } from "../plugins/harness-core/lib/render.mjs";
import { makeGitRepo, makeRepo } from "./helpers.mjs";

// Plumbing shared by every rung of the visual ladder. The views may share their plumbing and must
// never share their conclusions — escaping and argument parsing are plumbing; "what counts as a big
// file" is a conclusion and lives in model.mjs.

test("escaping covers every character that could close a tag or an attribute", () => {
  assert.equal(esc('<a href="x">&'), "&lt;a href=&quot;x&quot;&gt;&amp;");
});

test("escaping is applied to non-strings too, rather than throwing", () => {
  // File-derived values arrive as numbers often enough that a crash here would be a silly outage.
  assert.equal(esc(42), "42");
});

test("the default output path is used when no flag is given", () => {
  assert.equal(basename(outPath([], "city.html")), "city.html");
});

test("both -o and --out are honoured", () => {
  assert.equal(basename(outPath(["-o", "a.html"], "d.html")), "a.html");
  assert.equal(basename(outPath(["--out", "b.html"], "d.html")), "b.html");
});

test("the output path is absolute, so the file lands where the caller meant", () => {
  // isAbsolute, not startsWith("/") — on Windows an absolute path begins C:\\, so the POSIX
  // spelling failed a pure-logic function that was behaving correctly. Assert the property.
  assert.ok(isAbsolute(outPath(["-o", "rel.html"], "d.html")));
});

test("the repo name comes from the remote, not the checkout directory", () => {
  // A worktree is routinely called `repo-2`, and that in the title of a shared file reads as a
  // different project.
  const { root, git } = makeGitRepo({ "a.txt": "a\n" });
  git("remote", "add", "origin", "https://github.com/octocat/widget-shop.git");
  assert.equal(repoNameOf(root), "widget-shop");
});

test("with no remote it falls back to the directory rather than to nothing", () => {
  const root = makeRepo({});
  assert.equal(repoNameOf(root), basename(root));
});

// Shared test scaffolding.
//
// Extracted when the clone gate flagged `makeRepo` pasted across three suites. Unlike the scanners —
// standalone PATH executables that deliberately must not import across that boundary — test files
// are ordinary modules in one tree, so there is no reason for them to each own a copy.
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGINS = join(dirname(fileURLToPath(import.meta.url)), "../plugins");
export const bin = (plugin, name) => join(PLUGINS, plugin, "bin", name);

/** A throwaway repository seeded with exactly the files a case needs. */
export function makeRepo(files = {}) {
  const root = mkdtempSync(join(tmpdir(), "botw-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

/** Run a harness executable in `cwd`. A non-zero exit is a RESULT, not a throw — gates fail on purpose. */
export function runTool(binPath, cwd, args = [], env = {}) {
  const opts = { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...env } };
  try {
    return { code: 0, out: execFileSync(binPath, args, opts) };
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

/**
 * A throwaway git repository on `main`, initialised and identified.
 *
 * With files, they are committed, so HEAD resolves and the tree is clean. With `{}` the repo is left
 * UNBORN on purpose — that is a real state a tool meets (a fresh `git init`), and several cases exist
 * to prove nothing crashes there.
 */
export function makeGitRepo(files = { "README.md": "probe\n" }) {
  const root = makeRepo(files);
  const git = (...a) => execFileSync("git", a, { cwd: root, stdio: "pipe", encoding: "utf8" });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "probe@example.com");
  git("config", "user.name", "probe");
  if (Object.keys(files).length) {
    git("add", "-A");
    git("commit", "-qm", "init");
  }
  return { root, git };
}

/**
 * The promise every rendered page in this repo makes: it opens from disk, survives being emailed,
 * and renders under a strict CSP. Asserted identically by the map and the city, so it lives once —
 * the clone gate flagged the second copy in the change that created it.
 */
export function assertStandalone(assert, html) {
  assert.doesNotMatch(html, /<link\b[^>]*rel=["']?stylesheet/i, "no external stylesheet");
  assert.doesNotMatch(html, /<script\b/i, "no script at all");
  assert.doesNotMatch(html, /https?:\/\/[^"')\s]+\.(css|js|woff2?|png|jpg|svg)/i, "no remote asset");
}

/**
 * A page written to disk must be a whole document. Without a doctype every browser opens it in
 * QUIRKS MODE, where box-sizing and several inherited properties differ from the standards mode the
 * CSS was written against — it renders, which is why nothing complains, just not as designed.
 */
export function assertDocument(assert, html) {
  assert.match(html, /^<!doctype html>/i, "no doctype means quirks mode");
  for (const tag of ["<html lang=", "<head>", "<meta charset=", "</head>", "<body>", "</body>", "</html>"]) {
    assert.ok(html.includes(tag), `missing ${tag}`);
  }
}

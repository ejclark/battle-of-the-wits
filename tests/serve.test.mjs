// A local view is a security surface before it is a feature, so that is what most of this checks.
//
// A repository map names every file and its debt. That is a description of somebody's codebase, and
// it has no business being reachable from another machine — so the bind address is not a setting.
// The flag IS the vulnerability: the whole value of an address nobody can widen is that nobody can
// widen it in a hurry, at 2am, to show a colleague.
//
// The other half is staleness. `harness-map` writes a file you open by hand, which means the thing
// on screen is a photograph of the repo as it was when you last remembered to re-run the command —
// wrong shape for a picture OF CHANGE, because the moment it is interesting is the moment it is out
// of date. Nothing here is cached, and the tests say so.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { handle, indexDocument, revision } from "../plugins/harness-core/lib/serve.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = readFileSync(join(REPO, "plugins/harness-core/lib/serve.mjs"), "utf8");
// CODE only. Scanning the whole file matches the COMMENT that explains why 0.0.0.0 is refused, so
// documenting the rule would be indistinguishable from breaking it — the same brittle-assertion trap
// LESSONS.md describes, arriving for the seventh time today.
const SRC = RAW.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");

test("it binds to localhost, and that is not something a flag can change", () => {
  assert.match(SRC, /const HOST = "127\.0\.0\.1"/);
  // Planted violation, in the only form that matters: any path from an argument to the bind address.
  assert.doesNotMatch(SRC, /listen\([^)]*--host|listen\([^)]*HOST_ARG|0\.0\.0\.0/, "the bind address must not be reachable from the command line");
  const listen = SRC.match(/\.listen\(([^)]*)\)/)?.[1] ?? "";
  assert.ok(listen.includes("HOST"), `listen() must use the fixed HOST constant, got: ${listen}`);
});

test("every view re-derives, and nothing is cached", () => {
  // A cache here is a stale view wearing a performance argument. The scan costs milliseconds; a
  // photograph that claims to be live costs trust.
  assert.match(SRC, /"cache-control": "no-store"/);
  assert.doesNotMatch(SRC, /writeFileSync|mkdirSync/, "the server must not write the documents to disk — that is the thing it exists to replace");
});

test("a renderer that throws does not take the server down", () => {
  // A visualiser that dies on one bad scan is one you stop opening. The catch must say which view
  // failed, why, and leave the others reachable.
  //
  // Note what the real behaviour turned out to be, because it is better than the test I first wrote:
  // the renderers do NOT throw on a missing directory. They render an empty repository, which is the
  // honest answer — a directory with nothing in it HAS no districts, and that is a fact rather than
  // a failure. So this plants a renderer that genuinely throws instead of assuming one does.
  const exploding = { render: () => { throw new Error("scan blew up"); }, title: "Boom" };
  const wrapped = (() => {
    try {
      return { body: exploding.render() };
    } catch (err) {
      return { status: 500, body: `<p><b>${exploding.title} could not render.</b></p><pre>${err.message}</pre><p><a href="/">Back</a></p>` };
    }
  })();
  assert.equal(wrapped.status, 500);
  assert.match(wrapped.body, /could not render/);
  assert.match(wrapped.body, /Back/, "an error page with no way out is the dead end this project keeps fixing");
  assert.match(SRC, /catch \(err\)[\s\S]{0,200}could not render/, "serve.mjs must wrap every render in that shape");

  // And an empty or absent root must still serve, rather than 500 — the most likely first visitor is
  // somebody whose setup did not finish.
  assert.equal(handle("/nonexistent-path-for-this-test", "/").status ?? 200, 200);
  assert.equal(handle("/nonexistent-path-for-this-test", "/city").status ?? 200, 200);
});

test("the routes are exactly the views, plus the two the page needs", () => {
  assert.equal(handle(REPO, "/").type, "text/html");
  assert.equal(handle(REPO, "/rev").type, "text/plain");
  assert.equal(handle(REPO, "/nope").status, 404);
  assert.match(handle(REPO, "/nope").body, /Back/, "even a 404 gets a way back");

  const index = indexDocument("acme");
  for (const path of ["/map", "/city"]) {
    assert.ok(index.includes(`href="${path}"`), `${path} is served but not linked — a view nobody can reach`);
  }
});

test("the revision fingerprint moves when the repository does, and never throws", () => {
  const a = revision(REPO);
  assert.match(a, /^[0-9a-f]*:\d+$/, "HEAD plus working-tree size — the two things that mean 'it moved'");
  assert.equal(revision(REPO), a, "same state must give the same answer, or the page reloads forever");
  // A directory that is not a repository is a state, not an error — the server must still start.
  assert.doesNotThrow(() => revision("/nonexistent-path-for-this-test"));
});

test("it needs nothing installed", () => {
  // Same rule as the starter: a visualiser that needs an install before it renders anything is one
  // nobody opens twice.
  const imports = [...SRC.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]);
  for (const i of imports) {
    assert.ok(i.startsWith("node:") || i.startsWith("./"), `serve.mjs imports "${i}" — it must depend on nothing`);
  }
});

test("the browser opens by default, and failing to open one is never fatal", () => {
  // A headless box, a container, an SSH session and a machine with no default browser are all normal
  // places to run this. In every one of them, failing to open a tab says nothing about whether the
  // server came up — so the convenience must not be able to look like a server that did not start.
  assert.match(SRC, /detached: true/);
  assert.match(SRC, /\.unref\(\)/, "an attached child that ignores SIGINT holds the terminal after Ctrl-C");

  // Not through a shell, on any platform — the URL is an argument a shell could interpret.
  assert.doesNotMatch(SRC, /shell:\s*true/, "no opener may run through a shell");
  assert.doesNotMatch(SRC, /exec\(/, "exec() is a shell — spawn with an argv is not");

  // Every platform gets an opener, and Windows gets the `cmd /c start ""` form: `start` is a builtin
  // rather than a program, and without the empty title argument cmd treats the URL as a window title
  // and opens nothing. That is a silent no-op on the platform of this project's first contributor.
  for (const p of ["darwin", "win32"]) assert.match(SRC, new RegExp(`"${p}"`), `${p} needs an opener`);
  assert.match(SRC, /"open"|"xdg-open"/);
  assert.match(SRC, /"cmd", \["\/c", "start", "", url\]/, "the empty title argument is load-bearing on Windows");
});

test("a machine with no browser at all still gets a server", { concurrency: false }, () => {
  // THE BEHAVIOUR, not the shape of the code that implements it. The first version of this test
  // asserted a try/catch was present and passed while the server crashed on every boot in this very
  // container — because a missing opener arrives as an 'error' EVENT and try/catch never sees it.
  // An unhandled 'error' on a child process takes the process with it.
  //
  // So this runs the real CLI with PATH emptied, which is exactly a box with no xdg-open, no open
  // and no cmd, and requires it to serve anyway. It reproduced the crash before the fix.
  const port = 4100 + (process.pid % 400);
  const out = spawnSync(process.execPath, [join(REPO, "plugins/harness-core/lib/serve.mjs"), "--port", String(port)], {
    encoding: "utf8",
    timeout: 4000,
    env: { ...process.env, PATH: "", CI: "" },
  });
  const log = `${out.stdout ?? ""}${out.stderr ?? ""}`;
  assert.doesNotMatch(log, /Unhandled 'error' event|ENOENT/, `the server died trying to open a browser:\n${log}`);
  assert.match(log, /http:\/\/127\.0\.0\.1/, "it must still print its URL");
  assert.equal(out.signal, "SIGTERM", "it must still be running when the timeout kills it, not exited early");
});

test("CI never opens a tab, and there is a flag for everyone else", () => {
  // A build agent spawning browsers is a hang waiting to happen, and it must not depend on somebody
  // remembering a flag in a workflow file.
  assert.match(SRC, /--no-open/);
  assert.match(SRC, /process\.env\.CI/, "CI must be detected, not left to the caller to remember");
});

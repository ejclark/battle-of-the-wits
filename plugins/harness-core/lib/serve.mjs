#!/usr/bin/env node
// THE LOCAL VIEW — every visual surface, live, at one address.
//
//   npm start                # http://localhost:4173, and opens a tab
//   npm start -- --port N
//   npm start -- --no-open   # server only; CI is detected and never opens one
//
// `harness-map` and `harness-city` each write an HTML file you then open by hand — which means the
// thing on your screen is a photograph of a repository as it was when you last remembered to re-run
// a command. For a picture OF CHANGE that is the wrong shape: the moment it is interesting is the
// moment it is out of date.
//
// So nothing is written to disk and nothing is cached. Every request re-derives the document from
// the repository as it is right now, and the page reloads itself when the repository moves. The cost
// of that is a few milliseconds of scanning per request, which is the correct thing to spend to make
// a stale view structurally impossible.
//
// LOCALHOST ONLY, and not by default — by construction. A repository map names every file and its
// debt, which is a description of somebody's codebase that has no business being reachable from
// another machine. There is no flag to widen it, because the flag is the vulnerability: the whole
// value of a bind address you cannot change is that nobody can change it in a hurry.
//
// NO DEPENDENCIES, same rule as the starter. `node:http` is enough, and a visualiser that needs an
// install before it renders anything is a visualiser nobody opens twice.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { resolve as resolvePath } from "node:path";
import { stateOf } from "./api.mjs";
import { cityDocument } from "./city.mjs";
import { historyDocument } from "./history.mjs";
import { mapDocument } from "./cartography.mjs";
import { overviewDocument } from "./overview.mjs";
import { gitOut, repoNameOf } from "./render.mjs";
import { towerDocument } from "./tower.mjs";
import { HARNESS_ROOT, importedCheckouts } from "./workspace.mjs";

const HOST = "127.0.0.1"; //  never a public interface — see above; deliberately not configurable

/**
 * A cheap fingerprint of "has the repository moved?" — HEAD plus the shape of the working tree.
 *
 * Deliberately not a file watcher. A watcher is another dependency, another failure mode, and it
 * fires on events nobody cares about; polling a two-command fingerprint costs nothing and answers
 * exactly the question the page is asking.
 */
export function revision(root) {
  //  not a repo, or no commits yet — both are states, not errors, so an unanswerable git reads empty
  const git = (args) => (gitOut(root, args) ?? "").trim();
  return `${git(["rev-parse", "HEAD"])}:${git(["status", "--porcelain"]).length}`;
}

/** The reload script. Polls the fingerprint and reloads when it changes; silent when it cannot. */
const LIVE = `<script>
(async () => {
  let seen = null;
  for (;;) {
    try {
      const now = await (await fetch("/rev")).text();
      if (seen !== null && now !== seen) location.reload();
      seen = now;
    } catch { /* server gone — stop asking rather than spinning on errors */ return; }
    await new Promise((r) => setTimeout(r, 1500));
  }
})();
</script>`;

const VIEWS = {
  "/": { title: "Overview", render: overviewDocument },
  "/map": { title: "Map", render: mapDocument },
  "/history": { title: "History", render: historyDocument },
  "/city": { title: "City", render: cityDocument },
  "/tower": { title: "Tower", render: towerDocument },
};

/**
 * The old index — a link list. Kept as a fallback for a root that cannot produce an overview at all,
 * because a server whose home page can fail has no home page.
 */
export function indexDocument(repoName) {
  return `<!doctype html><meta charset="utf-8"><title>${repoName}</title>
<style>body{font:17px/1.6 ui-serif,Georgia,serif;max-width:32rem;margin:5rem auto;padding:0 1.5rem;
background:#fbfbf9;color:#16181a}@media(prefers-color-scheme:dark){body{background:#14161a;color:#eceae4}}
h1{font-size:1.5rem}a{display:block;padding:.9rem 0;border-bottom:1px solid #8883;text-decoration:none;color:inherit}
a:hover{color:#b4552d}small{opacity:.65}</style>
<h1>${repoName}</h1>
${Object.entries(VIEWS)
  .map(([path, v]) => `<a href="${path}"><b>${v.title}</b><br><small>${path}</small></a>`)
  .join("\n")}
<p><small>Live — every view re-derives from the repository on each request, and reloads when it moves.
Bound to localhost only.</small></p>${LIVE}`;
}

export function handle(root, url) {
  const repoName = repoNameOf(root);
  if (url === "/rev") return { type: "text/plain", body: revision(root) };
  // The model as data, for the client-side app and for anything else that wants the numbers without
  // scraping a page. Same derivation the server-rendered views use — two readers of the same repo
  // that disagreed would be worse than either one alone.
  if (url === "/api/state") return { type: "application/json", body: JSON.stringify(stateOf(root)) };
  const view = VIEWS[url];
  if (!view) return { status: 404, type: "text/html", body: `<p>No such view. <a href="/">Back</a>.</p>` };

  // A renderer that throws must not take the server with it. Say which view failed and why, and
  // leave the others reachable — a visualiser that dies on one bad scan is one you stop trusting.
  try {
    return { type: "text/html", body: view.render(root, repoName) + LIVE };
  } catch (err) {
    // The home page is the one view that must never be a dead end — falling back to the link list
    // keeps the other views reachable from a root that cannot summarise itself.
    if (url === "/") return { type: "text/html", body: indexDocument(repoName) + LIVE };
    return {
      status: 500,
      type: "text/html",
      body: `<p><b>${view.title} could not render.</b></p><pre>${String(err?.message ?? err)}</pre><p><a href="/">Back</a></p>`,
    };
  }
}

/**
 * Open the page in whatever the machine calls a browser.
 *
 * Three commands, one per platform, and NONE of them goes through a shell — the URL is built here
 * and would still be an argument a shell could interpret. `start` on Windows is a `cmd` builtin
 * rather than a program, hence the wrapper, and the empty string is its title argument: omit it and
 * `cmd` treats the URL as the window title and opens nothing.
 *
 * NEVER FATAL, and never even loud. A headless box, a container, an SSH session and a machine with no
 * default browser are all completely normal places to run this, and in every one of them the failure
 * to open a tab says nothing about whether the server came up. The URL is already printed; the tab is
 * a convenience on top of it, so a convenience that fails must not look like a server that did.
 */
function openBrowser(url) {
  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  try {
    // Detached and unref'd: the browser must outlive nothing and hold nothing. Left attached, a
    // child that ignores SIGINT keeps the terminal captive after Ctrl-C, which turns a nicety into
    // the thing you have to kill from another window.
    const child = spawn(cmd, args, { stdio: "ignore", detached: true });
    // A MISSING OPENER ARRIVES AS AN EVENT, NOT A THROW, and an unhandled 'error' event on a child
    // process takes the whole process down. So the try/catch alone was decoration: on a box with no
    // xdg-open — a container, a CI image, a headless server — the server printed its URL and then
    // died on the very convenience meant to sit on top of it. Caught here rather than by the caller,
    // because there is exactly one thing to do about it and it is nothing.
    child.on("error", () => {});
    child.unref();
  } catch {
    /* no browser, no display, no problem — the URL is on screen either way */
  }
}

/**
 * Which repository this server is ABOUT — the container question, answered from evidence.
 *
 * The harness is a container: repositories are pulled into `.harness/workspace/` and worked on
 * there, so a person who typed `npm start` while working on an imported repo almost never means
 * "show me the harness". The rules, in order, each one a decision the system can make itself:
 *
 *   1. `--root PATH` — an explicit answer wins outright, from any cwd.
 *   2. cwd is NOT the harness root — the server was started inside some repository on purpose;
 *      serve that. This is the path every adopter is on, and it does not change.
 *   3. cwd IS the harness root and exactly ONE checkout is imported — that checkout is the subject.
 *      One import is unambiguous evidence of what is being worked on.
 *   4. Anything else — zero imports, or several — falls back to the harness itself, and when there
 *      are several the chooser is printed rather than guessed at: picking one of three imports by
 *      some tiebreak would be the harness inventing an answer the human never gave.
 */
export function resolveRoot(argv, cwd, harnessRoot, imports) {
  const i = argv.indexOf("--root");
  if (i >= 0 && argv[i + 1]) return { root: resolvePath(argv[i + 1]), why: "--root" };
  if (resolvePath(cwd) !== resolvePath(harnessRoot)) return { root: cwd, why: "cwd" };
  if (imports.length === 1) return { root: imports[0].dir, why: `the one imported checkout (${imports[0].repo} @ ${imports[0].branch})` };
  return { root: cwd, why: imports.length ? "several imports — say which with --root" : "no imports — serving the harness itself" };
}

// ── CLI ────────────────────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith("serve.mjs")) {
  const argv = process.argv.slice(2);
  const port = Number(argv[argv.indexOf("--port") + 1]) || 4173;
  const imports = importedCheckouts();
  const { root, why } = resolveRoot(argv, process.cwd(), HARNESS_ROOT, imports);
  console.log(`\n  root: ${root}\n        (${why})`);
  if (imports.length > 1) for (const c of imports) console.log(`        --root ${c.dir}`);
  // Opening a tab is the right default for somebody who typed `npm start` and wants to look at
  // something. It is the wrong default for CI, for a container, and for anyone who just wants the
  // process — so the escape is a flag, and CI is detected rather than left to remember the flag.
  const openTab = !argv.includes("--no-open") && !process.env.CI;

  createServer((req, res) => {
    const { status = 200, type, body } = handle(root, (req.url ?? "/").split("?")[0]);
    res.writeHead(status, { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store" });
    res.end(body);
  }).listen(port, HOST, () => {
    console.log(`\n  ⛬  ${repoNameOf(root)} — http://${HOST}:${port}\n`);
    console.log("      /         what the instruments say");
    console.log("      /history  what each budget looked like before today");
    console.log("      /map      the repository as territory");
    console.log("      /city     the repository as a skyline");
    console.log("      /tower    the repository as a watchtower — what is measured, and what is not\n");
    console.log("  Live: every view re-derives on request and the page reloads when the repo moves.");
    console.log("  Localhost only, by construction — a map names every file and its debt.\n");
    if (openTab) openBrowser(`http://${HOST}:${port}/`);
    else console.log("  (not opening a tab — --no-open, or CI is set)\n");
  });
}

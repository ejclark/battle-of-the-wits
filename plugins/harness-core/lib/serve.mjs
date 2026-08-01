#!/usr/bin/env node
// THE LOCAL VIEW — every visual surface, live, at one address.
//
//   harness-serve            # http://localhost:4173
//   harness-serve --port N
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
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { cityDocument } from "./city.mjs";
import { mapDocument } from "./cartography.mjs";
import { repoNameOf } from "./render.mjs";

const HOST = "127.0.0.1"; //  never a public interface — see above; deliberately not configurable

/**
 * A cheap fingerprint of "has the repository moved?" — HEAD plus the shape of the working tree.
 *
 * Deliberately not a file watcher. A watcher is another dependency, another failure mode, and it
 * fires on events nobody cares about; polling a two-command fingerprint costs nothing and answers
 * exactly the question the page is asking.
 */
export function revision(root) {
  const git = (args) => {
    try {
      return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      return ""; //  not a repo, or no commits yet — both are states, not errors
    }
  };
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
  "/map": { title: "Map", render: mapDocument },
  "/city": { title: "City", render: cityDocument },
};

/** The index. Deliberately plain — it exists to get you one click away, not to be a dashboard. */
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
  if (url === "/") return { type: "text/html", body: indexDocument(repoName) };

  const view = VIEWS[url];
  if (!view) return { status: 404, type: "text/html", body: `<p>No such view. <a href="/">Back</a>.</p>` };

  // A renderer that throws must not take the server with it. Say which view failed and why, and
  // leave the others reachable — a visualiser that dies on one bad scan is one you stop trusting.
  try {
    return { type: "text/html", body: view.render(root, repoName) + LIVE };
  } catch (err) {
    return {
      status: 500,
      type: "text/html",
      body: `<p><b>${view.title} could not render.</b></p><pre>${String(err?.message ?? err)}</pre><p><a href="/">Back</a></p>`,
    };
  }
}

// ── CLI ────────────────────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith("serve.mjs")) {
  const argv = process.argv.slice(2);
  const port = Number(argv[argv.indexOf("--port") + 1]) || 4173;
  const root = process.cwd();

  createServer((req, res) => {
    const { status = 200, type, body } = handle(root, (req.url ?? "/").split("?")[0]);
    res.writeHead(status, { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store" });
    res.end(body);
  }).listen(port, HOST, () => {
    console.log(`\n  ⛬  ${repoNameOf(root)} — http://${HOST}:${port}\n`);
    console.log("      /map    the repository as territory");
    console.log("      /city   the repository as a skyline\n");
    console.log("  Live: every view re-derives on request and the page reloads when the repo moves.");
    console.log("  Localhost only, by construction — a map names every file and its debt.\n");
  });
}

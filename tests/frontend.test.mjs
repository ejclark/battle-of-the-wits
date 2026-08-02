// THE CLIENT APP, AND THE ONE THING THAT WILL GO WRONG WITH IT.
//
// There are now two renderings of the same repository: the server-rendered views anybody gets from
// `npm start`, and the client-side app that hot-reloads under `npm run dev`. That is a deliberate
// split — an adopter installs the plugins and has no build step, so a UI that only exists after a
// bundler runs is a UI they do not have — but it buys a failure mode with it.
//
// TWO RENDERINGS THAT DISAGREE IS WORSE THAN EITHER ALONE. Not because the pixels differ, but
// because the DOCTRINE can differ: one of them can start showing an unlit gate as 0, or an untracked
// budget as a flat line, while the other keeps telling the truth — and nothing goes red, because each
// is internally consistent. So these tests are mostly about the refusals surviving in both places.
//
// The palette is checked the same way and for the same reason: shell.mjs and web/app.css are one
// design system written twice, and a design system that drifts is the thing the chassis was
// extracted to end.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { TOKENS } from "../plugins/harness-core/lib/shell.mjs";
import { stateOf } from "../plugins/harness-core/lib/api.mjs";
import { handle } from "../plugins/harness-core/lib/serve.mjs";
import { codeOf } from "./helpers.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSS = readFileSync(join(REPO, "web/app.css"), "utf8");
const APP = codeOf(join(REPO, "web/main.js"));

/** Every custom property declared in a block, as a map. */
const tokensIn = (text, selector) => {
  const block = text.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
  // Whitespace-normalised, because the two files are formatted by different tools: the chassis is a
  // template literal inside .mjs and app.css goes through the CSS formatter, so `Georgia,serif` and
  // `Georgia, serif` are the same declaration written twice. Comparing raw text would fail on a
  // formatting change that means nothing — pinning a rendering instead of the property, which is the
  // trap this repository keeps re-learning.
  return Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+)/g)].map((m) => [
      m[1],
      m[2].replace(/\s+/g, " ").replace(/\s*,\s*/g, ",").trim(),
    ]),
  );
};

test("the client stylesheet and the server chassis are the same design system", () => {
  // One system written twice. If a token exists in one and not the other, or the two disagree about
  // a value, the two halves of this application have started to look like different products.
  for (const selector of [":root", ':root\\[data-theme="dark"\\]', ':root\\[data-theme="light"\\]']) {
    const server = tokensIn(TOKENS, selector);
    const client = tokensIn(CSS, selector);
    assert.ok(Object.keys(server).length > 0, `chassis is missing ${selector}`);
    for (const [k, v] of Object.entries(server)) {
      assert.equal(client[k], v, `${selector} ${k}: chassis says ${v}, web/app.css says ${client[k]} — the palettes have drifted`);
    }
  }
});

test("the client needs no network beyond its own origin", () => {
  // Same rule as the server-rendered views: no CDN, no webfont, nothing that turns a local tool into
  // something that needs the internet to render.
  assert.doesNotMatch(CSS, /@import|https?:\/\//, "web/app.css must not fetch anything");
  // The SVG namespace is a URI, not a request — createElementNS never fetches it, and excluding it
  // is the difference between an assertion about network access and one about the letters "http".
  const fetched = APP.replace(/https?:\/\/www\.w3\.org\/\d{4}\/svg/g, "");
  assert.doesNotMatch(fetched, /https?:\/\/(?!127\.0\.0\.1|localhost)/, "the app must not call out to another host");
});

test("the API carries the refusals in its shape, not in a convention", () => {
  const state = stateOf(REPO);

  // A client cannot tell "unmeasured" from "clean" unless the data says so. `lit` is that field, and
  // an unlit gate's budget must be null rather than 0 — a 0 sums into a total that reads as perfect.
  for (const g of state.gates) {
    assert.equal(typeof g.lit, "boolean", `${g.gate} must say whether it is lit`);
    if (!g.lit) assert.equal(g.budget, null, `${g.gate} is unlit, so its budget must be null and never 0`);
  }
  // Same for history: never committed is not a flat line at zero.
  for (const s of state.history) {
    assert.equal(typeof s.tracked, "boolean");
    if (!s.tracked) assert.deepEqual(s.points, [], `${s.gate} is untracked, so it must carry no points`);
  }
  // And direction must say when it is below its own floor rather than handing over a bare ratio.
  assert.equal(typeof state.direction.readable, "boolean", "the client must be told when direction is unreadable");
});

test("nothing in the API describes a person", () => {
  // The place somebody would reach for `git log --format=%an` to make a page look busier.
  const state = stateOf(REPO);
  const json = JSON.stringify(state);
  assert.doesNotMatch(json, /"author"|"committer"|"email"/, "the model must carry no identity fields");
  for (const s of state.history) {
    for (const p of s.points) {
      assert.deepEqual(Object.keys(p).sort(), ["date", "sha", "subject", "total"], "a point is the commit, not the committer");
    }
  }
  assert.doesNotMatch(codeOf(join(REPO, "plugins/harness-core/lib/api.mjs")), /%an|%ae|%cn|%ce/);
});

test("the client honours 'unlit is not zero' in words, not just in data", () => {
  // The API can carry the distinction perfectly and the client can still render it as clean. These
  // are the two sentences that make it visible to a reader, and they must survive a refactor of the
  // rendering — which is why the assertion is on the app, not on a snapshot of its output.
  assert.match(APP, /Unlit is not zero/, "the overview must say it when a gate has never been frozen");
  assert.match(APP, /never been committed here/, "the history must say it when a budget has no record");
  assert.match(APP, /Nothing here describes a person/, "the dignity rule is stated on the page, same as the server views");
});

test("the API route is served, and is the only new one", () => {
  const res = handle(REPO, "/api/state");
  assert.equal(res.type, "application/json");
  assert.doesNotThrow(() => JSON.parse(res.body));
  // A route that does not exist must still 404 rather than fall through to something.
  assert.equal(handle(REPO, "/api/nope").status, 404);
});

test("the server still renders every view without a bundler", () => {
  // THE PATH EVERY ADOPTER IS ON. They install the plugins, they have no build step, and if this
  // breaks the UI simply does not exist for them. A bundler in this repository must never become a
  // requirement for seeing the thing.
  for (const path of ["/", "/history", "/map", "/city"]) {
    const res = handle(REPO, path);
    assert.equal(res.status ?? 200, 200, `${path} must render server-side`);
    assert.match(res.body, /^<!doctype html>/i, `${path} must be a complete document`);
  }
  const serve = codeOf(join(REPO, "plugins/harness-core/lib/serve.mjs"));
  for (const i of [...serve.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1])) {
    assert.ok(i.startsWith("node:") || i.startsWith("./"), `serve.mjs imports "${i}" — the shipped server must depend on nothing`);
  }
});

test("the dev runner starts both halves and kills both halves", () => {
  // An orphaned data server holding its port makes the next `npm run dev` fail with EADDRINUSE,
  // which reads as "the tool is broken" rather than "something from ten minutes ago is still up".
  const dev = codeOf(join(REPO, "scripts/dev.mjs"));
  assert.match(dev, /SIGINT/);
  assert.match(dev, /SIGTERM/);
  assert.match(dev, /serve\.mjs/, "it must start the data server");
  assert.match(dev, /rspack/, "it must start the ui server");
  assert.match(dev, /--no-open/, "only one of the two may open a tab");
  // Resolved out of node_modules rather than PATH, and .cmd handled — the Windows class of defect
  // this project has now hit four times.
  assert.match(dev, /node_modules/, "the bundler must be resolved from node_modules, not from PATH");
  assert.match(dev, /win32.*\.cmd|\.cmd.*win32/s, "Windows needs the .cmd twin of the bundler binary");
});

// The defect here is invisible by construction, which is why it gets a test rather than a habit.
//
// GitHub accepts an issue form that names a label nobody created. It files the issue and applies
// nothing — no error, no warning, no red. So the failure mode is a coordination layer reading an
// empty set for weeks while every surface looks healthy.
//
// Planted violations throughout, per the portability rule: a parser aimed at a directory with no
// forms in it finds no labels and reports success, which is indistinguishable from a repository
// whose labels are all present. Every case here plants something a broken reader would miss.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { clamp, colorFor, declaredLabels } from "../scripts/sync-labels.mjs";
import { codeOf } from "./helpers.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
// The FILE, not the module: these assertions are about what the source may contain, and a re-export
// could satisfy an imported symbol while the forbidden code sat right there.
const SRC = codeOf(join(REPO, "scripts/sync-labels.mjs"));

const forms = (files) => {
  const d = mkdtempSync(join(tmpdir(), "labels-"));
  mkdirSync(d, { recursive: true });
  for (const [name, body] of Object.entries(files)) writeFileSync(join(d, name), body);
  return d;
};

test("this repository's own forms declare exactly the labels that must exist", () => {
  // The real thing, not a fixture. If a form is added with a new label, this test is the first place
  // that says so — which is the point, because GitHub never will.
  const { labels, unparsed } = declaredLabels(join(REPO, ".github/ISSUE_TEMPLATE"));
  assert.deepEqual(labels.map((l) => l.name).sort(), ["idea", "snag"]);
  assert.deepEqual(unparsed, [], "every form's labels must be readable");
  for (const l of labels) {
    assert.ok(l.description.length > 0, `${l.name} must carry the form's description`);
    assert.ok(l.description.length <= 100, `${l.name} exceeds GitHub's 100-character ceiling`);
  }
});

test("both YAML spellings are read, because the schema allows both", () => {
  const d = forms({
    "flow.yml": 'name: A\ndescription: does a thing\nlabels: ["one", "two"]\nbody: []\n',
    "block.yml": "name: B\ndescription: does another\nlabels:\n  - three\n  - four\nbody: []\n",
  });
  const { labels } = declaredLabels(d);
  assert.deepEqual(labels.map((l) => l.name).sort(), ["four", "one", "three", "two"]);
});

test("a labels block this cannot parse is REPORTED, never silently read as none", () => {
  // The failure that would recreate the original defect one level up: a form declaring a label in a
  // shape the parser does not handle, reported as a repository with nothing missing.
  const d = forms({ "weird.yml": "name: C\ndescription: x\nlabels: &anchor\n  <<: *something\nbody: []\n" });
  const { labels, unparsed } = declaredLabels(d);
  assert.deepEqual(labels, []);
  assert.deepEqual(unparsed, ["weird.yml"], "an unreadable declaration must name the file it is in");
});

test("config.yml is not a form and declares no labels", () => {
  const d = forms({
    "config.yml": "blank_issues_enabled: true\nlabels: [\"not-a-real-label\"]\n",
    "real.yml": 'name: R\ndescription: y\nlabels: ["real"]\nbody: []\n',
  });
  assert.deepEqual(declaredLabels(d).labels.map((l) => l.name), ["real"]);
});

test("no forms at all is a state, not a crash — an adopter starts here", () => {
  assert.deepEqual(declaredLabels("/nonexistent-path-for-this-test"), { labels: [], unparsed: [] });
  assert.deepEqual(declaredLabels(forms({})), { labels: [], unparsed: [] });
});

test("two forms naming the same label produce one label, not two", () => {
  const d = forms({
    "a.yml": 'name: A\ndescription: first\nlabels: ["snag"]\nbody: []\n',
    "b.yml": 'name: B\ndescription: second\nlabels: ["snag"]\nbody: []\n',
  });
  assert.equal(declaredLabels(d).labels.length, 1);
});

test("a long description is cut on a word and says it was cut", () => {
  const long = `${"word ".repeat(40)}end`;
  const out = clamp(long);
  assert.ok(out.length <= 100, `got ${out.length}`);
  assert.match(out, /…$/, "a silent truncation reads as the whole description");
  assert.doesNotMatch(out, /\s…$/, "cut on the word, not on the space after it");
  assert.equal(clamp("short"), "short", "a description that fits is untouched");
});

test("the colour for a name is deterministic and always a valid hex", () => {
  // Two people running this must get the same palette, and neither should have to choose one — a
  // colour is not a decision worth a config option, but it does have to be reproducible.
  for (const name of ["snag", "idea", "bug", "a", "", "🐛"]) {
    assert.equal(colorFor(name), colorFor(name), `${name} must be stable across calls`);
    assert.match(colorFor(name), /^[0-9a-f]{6}$/, `${name} must produce a 6-digit hex without a #`);
  }
  assert.notEqual(colorFor("snag"), colorFor("idea"), "different names should not collapse to one colour");
});

test("it creates and never updates", () => {
  // A label that exists is somebody's choice, made in a UI. A script that re-asserts its colour every
  // run is one that argues with its owner until it gets switched off — the same grandfather rule the
  // budgets run on.
  assert.doesNotMatch(SRC, /method:\s*"(PATCH|PUT|DELETE)"/, "no update or delete path may exist");
  assert.match(SRC, /method:\s*"POST"/, "creating the missing ones is the whole job");
});

test("it degrades honestly rather than rendering a verdict it cannot support", () => {
  // A gate that cannot measure must not report in either direction. Both unmeasurable states — no
  // repository named, and the label list unreadable — must exit 0 rather than pass or fail.
  assert.match(SRC, /No repository given, so nothing was compared/);
  assert.match(SRC, /nothing is known either way/);
});

test("the comparison against a real repository, including pagination", async () => {
  // The verdict half, which the unit tests above do not reach. Stubbed rather than mocked: a real
  // server on a real socket, because the thing most likely to be wrong here is the request itself.
  //
  // Pagination is planted at exactly the boundary that breaks a naive reader — a full first page.
  // Stopping there would report every label on page two as missing and try to create labels that
  // already exist.
  const { createServer } = await import("node:http");
  const page1 = Array.from({ length: 100 }, (_, i) => ({ name: `filler-${i}` }));
  const server = createServer((req, res) => {
    const page = Number(new URL(req.url, "http://x").searchParams.get("page"));
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(page === 1 ? page1 : page === 2 ? [{ name: "SNAG" }] : []));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const prev = process.env.GITHUB_API_URL;
  process.env.GITHUB_API_URL = base;
  try {
    const mod = await import(`../scripts/sync-labels.mjs?t=${base}`);
    const missing = await mod.missingFrom("o", "r", [{ name: "snag" }, { name: "idea" }], null);
    // The stub answers "SNAG" and the form declares "snag": GitHub treats label names as
    // case-insensitive for uniqueness, so a reader that did not would try to create one that
    // already exists and fail the run for a repository that is perfectly fine.
    assert.deepEqual(missing.map((l) => l.name), ["idea"], "a label on page two, cased differently, is present");
  } finally {
    if (prev === undefined) delete process.env.GITHUB_API_URL;
    else process.env.GITHUB_API_URL = prev;
    server.close();
  }
});

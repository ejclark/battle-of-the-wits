// SHAPE, NOT CONTENT — and the test that proves the difference is real.
//
// The load-bearing case is the pair: adding twenty ENTRIES must be invisible, and adding one FIELD
// must be reported. A validator that flagged both would make people stop extending their own systems;
// one that flagged neither would never notice a system growing a feature worth sharing.
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { validateShape, scan, entriesOf, fieldsIn } from "../plugins/harness-gates/lib/shape.mjs";
import { HarnessProject, LESSONS_SHAPE } from "../projen/index.mjs";

process.env.PROJEN_DISABLE_POST = "true";
const scratch = () => mkdtempSync(join(tmpdir(), "harness-shape-"));

const entry = (title, fields) =>
  `### ${title}\n${Object.entries(fields)
    .map(([k, v]) => `- **${k}:** ${v}`)
    .join("\n")}\n`;

const FULL = Object.fromEntries(LESSONS_SHAPE.fields.map((f) => [f, "x"]));

test("a conforming entry is silent", () => {
  const { missing, unknown } = validateShape(entry("something broke", FULL), LESSONS_SHAPE);
  assert.deepEqual(missing, []);
  assert.deepEqual(unknown, []);
});

test("TWENTY new entries are invisible — content is the repository's", () => {
  const doc = Array.from({ length: 20 }, (_, i) => entry(`incident ${i}`, FULL)).join("\n");
  const { missing, unknown } = validateShape(doc, LESSONS_SHAPE);
  assert.deepEqual(missing, [], "adding history must never be a finding");
  assert.deepEqual(unknown, [], "the harness has no business knowing what an entry says");
});

test("ONE new field IS reported — shape is the harness's business", () => {
  const doc = entry("something broke", { ...FULL, "BLAST RADIUS": "three services" });
  const { missing, unknown } = validateShape(doc, LESSONS_SHAPE);

  assert.deepEqual(missing, [], "extending a system is not a defect");
  assert.equal(unknown.length, 1);
  assert.deepEqual(unknown[0], { kind: "field", entry: "something broke", name: "BLAST RADIUS" });
});

test("a new top-level section is reported too", () => {
  const doc = `${entry("x", FULL)}\n## Open incidents\n`;
  const { unknown } = validateShape(doc, { ...LESSONS_SHAPE, sections: ["Closed"] });
  assert.ok(unknown.some((u) => u.kind === "section" && u.name === "Open incidents"));
});

test("a missing required field is a DEFECT, not a candidate — a parser would break on it", () => {
  const { PREVENTION, ...withoutPrevention } = FULL;
  const { missing, unknown } = validateShape(entry("half an entry", withoutPrevention), LESSONS_SHAPE);
  assert.deepEqual(unknown, []);
  assert.deepEqual(missing, [{ entry: "half an entry", field: "PREVENTION" }]);
});

test("entries and fields are parsed structurally — never by reading prose", () => {
  const doc = `### title one\nbody with **SHA:** abc\n### title two\nbody\n`;
  assert.deepEqual(
    entriesOf(doc).map((e) => e.title),
    ["title one", "title two"],
  );
  assert.deepEqual(fieldsIn("**ROOT CAUSE:** x and **PREVENTION:** y"), ["ROOT CAUSE", "PREVENTION"]);
});

test("an undeclared repo is UNMEASURED, never clean", () => {
  const report = scan(scratch());
  assert.equal(report.measured, false, "no declaration must not report zero problems");
  assert.match(report.why, /nothing declared/);
});

test("a declared file that does not exist is reported, never assumed clean", () => {
  const dir = scratch();
  writeFileSync(join(dir, "harness-shape.json"), JSON.stringify({ systems: { "docs/GONE.md": LESSONS_SHAPE } }));
  const report = scan(dir);
  assert.equal(report.measured, true);
  assert.equal(report.results[0].absent, true);
});

test("the component seeds the ledger and declares its shape", () => {
  const dir = scratch();
  new HarnessProject({ outdir: dir, name: "seeded", defaultReleaseBranch: "main", harnessRef: "v9.9.9" }).synth();

  assert.ok(existsSync(join(dir, "docs/LESSONS.md")), "the ledger is seeded");
  const declared = JSON.parse(readFileSync(join(dir, "harness-shape.json"), "utf8"));
  assert.deepEqual(declared.systems["docs/LESSONS.md"], LESSONS_SHAPE);
});

test("a repo's own lessons SURVIVE re-synthesis — regeneration must not reach content", () => {
  const dir = scratch();
  const make = () => new HarnessProject({ outdir: dir, name: "seeded", defaultReleaseBranch: "main", harnessRef: "v9.9.9" });
  make().synth();

  const path = join(dir, "docs/LESSONS.md");
  const mine = `${readFileSync(path, "utf8")}\n${entry("an incident only this repo had", FULL)}`;
  writeFileSync(path, mine);

  make().synth();
  assert.equal(readFileSync(path, "utf8"), mine, "a regenerated ledger would delete what it exists to remember");
});

test("end to end: the scanner reads the generated declaration and finds the planted extension", () => {
  const dir = scratch();
  new HarnessProject({ outdir: dir, name: "seeded", defaultReleaseBranch: "main", harnessRef: "v9.9.9" }).synth();
  mkdirSync(join(dir, "docs"), { recursive: true });

  const path = join(dir, "docs/LESSONS.md");
  writeFileSync(path, entry("a real incident", FULL));
  assert.deepEqual(scan(dir).results[0].unknown, [], "a conforming ledger is quiet");

  // PLANTED: somebody extended the system itself.
  writeFileSync(path, entry("a real incident", { ...FULL, "DETECTION LAG": "4h" }));
  const after = scan(dir).results[0];
  assert.equal(after.missing.length, 0, "an extension is never a defect");
  assert.deepEqual(after.unknown, [{ kind: "field", entry: "a real incident", name: "DETECTION LAG" }]);
});

// THE SYNTHESIZER, TESTED AGAINST A REPOSITORY SHAPED UNLIKE THIS ONE.
//
// Same rule as `portability.test.mjs`: a non-default layout, and every case asserts a PROPERTY that a
// wrong implementation would break — not that synth exited 0. A synthesizer that wrote nothing would
// pass an exit-code test perfectly.
import { mkdtempSync, readFileSync, existsSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { HarnessProject, GATE_SCRIPTS, HARNESS_PACKAGE } from "../projen/index.mjs";

// Skip projen's post-synthesis, which runs `npm install`. The suite is testing what gets WRITTEN;
// paying a package install per case would put minutes on the run for no assertion.
process.env.PROJEN_DISABLE_POST = "true";

const scratch = () => mkdtempSync(join(tmpdir(), "harness-projen-"));
const readJson = (dir, f) => JSON.parse(readFileSync(join(dir, f), "utf8"));

/** A project with a deliberately non-default layout — `lib/` + `spec/`, JavaScript rather than TS. */
function odd(outdir, extra = {}) {
  return new HarnessProject({
    outdir,
    name: "odd-shaped-repo",
    defaultReleaseBranch: "main",
    sourceDir: "lib",
    testDir: "spec",
    sourceExt: ".js",
    specSuffix: ".test.js",
    ...extra,
  });
}

test("a non-default layout reaches harness.json, so the gates measure the right tree", () => {
  const dir = scratch();
  odd(dir).synth();

  const desc = readJson(dir, "harness.json");
  assert.equal(desc.sourceDir, "lib");
  assert.equal(desc.testDir, "spec");
  assert.equal(desc.sourceExt, ".js");
  assert.equal(desc.specSuffix, ".test.js");
});

test("a conventional repo gets NO harness.json — defaults are documented, not restated", () => {
  const dir = scratch();
  new HarnessProject({ outdir: dir, name: "conventional", defaultReleaseBranch: "main" }).synth();

  assert.equal(
    existsSync(join(dir, "harness.json")),
    false,
    "writing six defaults back out reads like six decisions somebody made",
  );
});

test("only the keys that differ are written", () => {
  const dir = scratch();
  new HarnessProject({
    outdir: dir,
    name: "one-difference",
    defaultReleaseBranch: "main",
    sourceDir: "app",
  }).synth();

  assert.deepEqual(readJson(dir, "harness.json"), { sourceDir: "app" });
});

test("the gates arrive as plain npm scripts, not routed through projen's task runner", () => {
  const dir = scratch();
  odd(dir).synth();
  const pkg = readJson(dir, "package.json");

  for (const [name, exec] of Object.entries(GATE_SCRIPTS)) {
    // The PROPERTY: the script names the real command. `projen <task>` measured +590ms per
    // invocation (docs/adr/0001) and hides what the script actually does.
    assert.equal(pkg.scripts[name], exec, `${name} must invoke the binary directly`);
  }
});

test("the harness is a devDependency, so its bins land on node_modules/.bin", () => {
  const dir = scratch();
  odd(dir).synth();
  const pkg = readJson(dir, "package.json");
  assert.ok(pkg.devDependencies?.[HARNESS_PACKAGE], `${HARNESS_PACKAGE} must be declared`);
});

test("we refuse projen's batteries — no second linter, no second test runner", () => {
  const dir = scratch();
  odd(dir).synth();
  const deps = Object.keys(readJson(dir, "package.json").devDependencies ?? {});

  for (const unwanted of ["eslint", "jest", "prettier"]) {
    assert.ok(
      !deps.some((d) => d === unwanted || d.startsWith(`${unwanted}-`) || d.startsWith(`@${unwanted}/`)),
      `${unwanted} must not arrive — biome and rstest are the answer`,
    );
  }
});

test("the consumer's version survives — projen does not own the release", () => {
  const dir = scratch();
  odd(dir).synth();
  const pkg = readJson(dir, "package.json");
  // Left alone, projen writes 0.0.0 over a real version and adds commit-and-tag-version.
  assert.ok(!pkg.scripts?.release, "release tooling belongs to the consuming repository");
  assert.ok(
    !Object.keys(pkg.devDependencies ?? {}).includes("commit-and-tag-version"),
    "projen's release tool must not be installed",
  );
});

test("synthesis is idempotent — a second run changes nothing", () => {
  const dir = scratch();
  odd(dir).synth();
  const first = readFileSync(join(dir, "harness.json"), "utf8");

  odd(dir).synth();
  assert.equal(readFileSync(join(dir, "harness.json"), "utf8"), first);
});

test("a generated descriptor is restored after a hand edit — the artifact is not the source", () => {
  const dir = scratch();
  odd(dir).synth();
  const path = join(dir, "harness.json");

  writeFileSync(path, JSON.stringify({ sourceDir: "hand-edited" }), { mode: 0o644 });
  odd(dir).synth();

  assert.equal(readJson(dir, "harness.json").sourceDir, "lib", "regeneration is what enforces, not the mode bit");
});

test("the rstest glob follows the descriptor — planted: a repo whose specs are NOT tests/**.spec.ts", () => {
  const dir = scratch();
  odd(dir).synth(); // spec/ + .test.js

  const cfg = readFileSync(join(dir, "rstest.config.ts"), "utf8");
  // THE PLANTED VIOLATION. A renderer that ignored the descriptor emits `tests/**/*.spec.ts`, which
  // matches nothing in this layout. The runner then collects zero tests and reports a GREEN suite —
  // a false green produced by the harness's own scaffolding, which is the failure this repo exists
  // to prevent and has already shipped twice one layer down.
  assert.match(cfg, /include:\s*\["spec\/\*\*\/\*\.test\.js"\]/, "the glob must name the real layout");
  assert.doesNotMatch(cfg, /tests\/\*\*/, "the default glob would match nothing here");
});

test("verify names only the checks that exist — no typecheck in a JavaScript repo", () => {
  const dir = scratch();
  odd(dir).synth(); // sourceExt .js
  const pkg = readJson(dir, "package.json");

  assert.equal(pkg.scripts.typecheck, undefined, "a repo with no TypeScript gets no tsc step");
  assert.doesNotMatch(pkg.scripts.verify, /typecheck/, "verify must not call a script that is absent");
  assert.match(pkg.scripts.verify, /npm run lint/);
  assert.match(pkg.scripts.verify, /npm test/);
});

test("a TypeScript repo does get the typecheck step", () => {
  const dir = scratch();
  new HarnessProject({ outdir: dir, name: "ts-repo", defaultReleaseBranch: "main" }).synth();
  const pkg = readJson(dir, "package.json");

  assert.equal(pkg.scripts.typecheck, "tsc -p tsconfig.json --noEmit");
  assert.match(pkg.scripts.verify, /npm run typecheck/);
});

test("verify chains with && — a pipe would report a failing check as success", () => {
  const dir = scratch();
  odd(dir).synth();
  const verify = readJson(dir, "package.json").scripts.verify;

  // A pipeline exits with the LAST command's status, so `check | tail` is green on a red check.
  assert.doesNotMatch(verify, /\|/, "verify must never pipe a check anywhere");
  assert.match(verify, /&&/, "steps are chained so the first failure stops the run");
});

test("biome.json matches the template the bootstrap path writes — one config, two delivery paths", () => {
  const dir = scratch();
  odd(dir).synth();

  const emitted = readFileSync(join(dir, "biome.json"), "utf8");
  const template = readFileSync(
    join(import.meta.dirname, "../plugins/harness-core/templates/node/biome.json"),
    "utf8",
  );
  // Both paths exist until the marketplace retires. Two copies of one config is the drift this
  // repository has a gate for, so the component READS the template rather than restating it.
  assert.equal(emitted.trimEnd(), template.trimEnd());
});

test("biome and rstest arrive, and bring no second linter or runner with them", () => {
  const dir = scratch();
  odd(dir).synth();
  const deps = readJson(dir, "package.json").devDependencies ?? {};

  assert.ok(deps["@biomejs/biome"], "biome is the lint and format answer");
  assert.ok(deps["@rstest/core"], "rstest is the runner");
});

test("harness.json is written read-only, so a hand edit is awkward before it is reverted", () => {
  const dir = scratch();
  odd(dir).synth();
  // Belt and braces, and deliberately NOT the enforcement: root bypasses the mode bit entirely, and
  // package.json is writable on purpose because npm writes it. Regeneration is the real guarantee.
  assert.equal(statSync(join(dir, "harness.json")).mode & 0o222, 0, "no write bits");
});

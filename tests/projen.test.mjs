// THE SYNTHESIZER, TESTED AGAINST A REPOSITORY SHAPED UNLIKE THIS ONE.
//
// Same rule as `portability.test.mjs`: a non-default layout, and every case asserts a PROPERTY that a
// wrong implementation would break — not that synth exited 0. A synthesizer that wrote nothing would
// pass an exit-code test perfectly.
import { chmodSync, mkdtempSync, readFileSync, readdirSync, existsSync, writeFileSync, statSync } from "node:fs";
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
    // A checkout cannot know its published version, so it must be told. The refusal when it is NOT
    // told is itself a case below — this default keeps every other fixture about its own subject.
    harnessRef: "v9.9.9",
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
  new HarnessProject({ outdir: dir, name: "conventional", defaultReleaseBranch: "main", harnessRef: "v9.9.9" }).synth();

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
    harnessRef: "v9.9.9",
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

  // chmod FIRST, and that is the point rather than a workaround. projen writes this file 444, so a
  // hand edit genuinely requires making it writable — a person hits the same wall. The `{ mode }`
  // option on writeFileSync applies only when CREATING a file, so it does nothing to an existing
  // read-only one.
  //
  // This test passed locally and failed in CI, and the gap is worth naming: the container runs as
  // ROOT, and root ignores the permission bit entirely. A runner does not. Anything asserting
  // permission behaviour is untrustworthy when developed as root.
  assert.equal(statSync(path).mode & 0o222, 0, "projen wrote it read-only");
  chmodSync(path, 0o644);
  writeFileSync(path, JSON.stringify({ sourceDir: "hand-edited" }));
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
  new HarnessProject({ outdir: dir, name: "ts-repo", defaultReleaseBranch: "main", harnessRef: "v9.9.9" }).synth();
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

  const emitted = readJson(dir, "biome.json");
  const template = JSON.parse(
    readFileSync(join(import.meta.dirname, "../plugins/harness-core/templates/node/biome.json"), "utf8"),
  );
  // Both paths exist until the marketplace retires. Two copies of one config is the drift this
  // repository has a gate for, so the component READS the template rather than restating it.
  //
  // Compared SEMANTICALLY, not byte for byte. The first version of this assertion pinned the exact
  // serialisation, and it argued against a correct change: emitting a JsonFile rather than a TextFile
  // is what makes `addOverride` work on this file at all. The property is "same config, both paths" —
  // key order and whitespace were never part of it.
  assert.deepEqual(emitted, template);
});

test("the escape hatch actually works on biome.json — a TextFile would have blocked it", () => {
  const dir = scratch();
  const project = odd(dir);
  project.tryFindObjectFile("biome.json").addOverride("linter.rules.style.noDefaultExport", "off");
  project.synth();

  assert.equal(readJson(dir, "biome.json").linter.rules.style.noDefaultExport, "off");
});

test("biome and rstest arrive, and bring no second linter or runner with them", () => {
  const dir = scratch();
  odd(dir).synth();
  const deps = readJson(dir, "package.json").devDependencies ?? {};

  assert.ok(deps["@biomejs/biome"], "biome is the lint and format answer");
  assert.ok(deps["@rstest/core"], "rstest is the runner");
});

test("EVERY agent and skill the package ships reaches .claude/ — none may be quietly dropped", () => {
  const dir = scratch();
  odd(dir).synth();

  // Counted from the source of truth rather than hardcoded: a component that covered five of ten
  // would pass a spot-check forever, and the drills a repo does not have are invisible by nature.
  const pkgRoot = join(import.meta.dirname, "..");
  let agents = 0;
  let skills = 0;
  for (const base of ["plugins/harness-core", "plugins/harness-gates"]) {
    const a = join(pkgRoot, base, "agents");
    if (existsSync(a)) agents += readdirSync(a).filter((f) => f.endsWith(".md")).length;
    const s = join(pkgRoot, base, "skills");
    if (existsSync(s)) skills += readdirSync(s).filter((n) => existsSync(join(s, n, "SKILL.md"))).length;
  }

  assert.ok(agents > 0 && skills > 0, "the fixture would be vacuous if the package shipped neither");
  assert.equal(readdirSync(join(dir, ".claude/agents")).length, agents);
  assert.equal(readdirSync(join(dir, ".claude/skills")).length, skills);
  assert.ok(existsSync(join(dir, ".claude/skills/decompose/SKILL.md")), "skills keep their directory shape");
});

test("git hooks are written executable — a hook git cannot run enforces nothing", () => {
  const dir = scratch();
  odd(dir).synth();

  for (const hook of ["pre-commit", "commit-msg", "pre-push", "post-commit"]) {
    const path = join(dir, ".husky", hook);
    assert.ok(existsSync(path), `${hook} must exist`);
    assert.ok(statSync(path).mode & 0o111, `${hook} must be executable`);
  }
  // CI is confirmation, not the first line of defence.
  assert.match(readFileSync(join(dir, ".husky/pre-push"), "utf8"), /verify/);
  assert.equal(readJson(dir, "package.json").scripts.prepare, "husky");
});

test("the adopter's workflow CALLS the pipeline and pins an immutable ref", () => {
  const dir = scratch();
  odd(dir).synth();
  const wf = readFileSync(join(dir, ".github/workflows/verify.yml"), "utf8");

  // Scoped to the `uses:` LINE, not the whole file. The first version matched anywhere and caught
  // the file's own comment explaining why `@main` is wrong — a true statement failing a correct
  // implementation. The ref is the only thing that grants anything, so it is the only thing to check.
  const uses = wf.split("\n").filter((l) => l.trim().startsWith("uses:"));
  assert.equal(uses.length, 1, "one call, so there is one ref to reason about");
  assert.match(uses[0], /ejclark\/dungeon-crawler\/\.github\/workflows\/verify\.yml@/, "it must call, not copy");
  // A moving ref would let upstream change what runs with this repository's credentials at any
  // time — the harness doing, in someone else's repo, what its own preflight forbids here (idea #30).
  assert.doesNotMatch(uses[0], /@(main|master|HEAD)\s*$/, "a moving ref is a standing grant over the adopter's CI");
  assert.match(uses[0], /@v9\.9\.9\s*$/, "pinned to the ref it was given");
  assert.ok(wf.split("\n").length < 25, "the adopter's file stays small enough to actually read");
});

test("a checkout REFUSES to pin a ref rather than inventing one", () => {
  const dir = scratch();
  // No harnessRef, and this package's committed version is the semantic-release placeholder. Emitting
  // `@v0.0.0-development` would put a ref that resolves to nothing into somebody's CI, discovered on
  // their first pull request instead of here.
  assert.throws(
    () => new HarnessProject({ outdir: dir, name: "no-ref", defaultReleaseBranch: "main" }).synth(),
    /cannot pin a harness ref/,
  );
});

test("the reusable pipeline exists upstream and declares workflow_call", () => {
  const upstream = readFileSync(join(import.meta.dirname, "../.github/workflows/verify.yml"), "utf8");
  assert.match(upstream, /workflow_call:/, "a caller with nothing to call is a green check that never runs");
  assert.doesNotMatch(upstream, /secrets:\s*inherit/, "a verify run needs no secret and must not ask for one");
  // Never piped: a pipeline exits with the last command's status and would report a red gate green.
  assert.doesNotMatch(upstream, /npm run \$\{\{ inputs\.verify-script \}\}\s*\|/, "verify must not be piped");
});

test("docker is opt-in — a Dockerfile nobody asked for is an opinion, not a default", () => {
  const off = scratch();
  odd(off).synth();
  assert.equal(existsSync(join(off, "Dockerfile")), false);

  const on = scratch();
  odd(on, { docker: true }).synth();
  const dockerfile = readFileSync(join(on, "Dockerfile"), "utf8");
  assert.match(dockerfile, /^FROM ghcr\.io\/ejclark\/dungeon-crawler\/node-base:\d/m, "the base is delegated, not pinned by hand");
  assert.match(dockerfile, /USER node/, "never root");
  assert.match(readFileSync(join(on, ".dockerignore"), "utf8"), /^\.env$/m, "secrets must not be baked into a layer");
});

test("harness.json is written read-only, so a hand edit is awkward before it is reverted", () => {
  const dir = scratch();
  odd(dir).synth();
  // Belt and braces, and deliberately NOT the enforcement: root bypasses the mode bit entirely, and
  // package.json is writable on purpose because npm writes it. Regeneration is the real guarantee.
  assert.equal(statSync(join(dir, "harness.json")).mode & 0o222, 0, "no write bits");
});

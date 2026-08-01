// COLD START — what an adopter meets in their first five minutes, and every way it used to be red.
//
// Run end to end from zero into `npm init -y` + one `.js` file, the one-shot produced a repository
// whose first `npm run verify` FAILED, four separate ways. Every one of them was the harness's own
// doing, and all four are the same shape: **go red on day one for something the adopter did not do.**
// That is not a bad first impression, it is a fatal one — a quality system that greets you with an
// unexplained failure gets switched off before it has proved anything.
//
// The four, and the root cause is one string:
//
//   1. `npm init` writes `test: echo "Error: no test specified" && exit 1`. The bootstrap read that
//      placeholder as a decision to respect, wired it into `verify`, and verify failed by design.
//   2. `gateSpecFor` infers the RUNNER from that same string. The placeholder matches nothing, so it
//      concluded describe/it/expect and wrote `gates.spec.ts` into a plain JavaScript repo — a gate
//      file no runner ever collects. Gates present, gates inert, suite green.
//   3. The gate template could not tell ENOENT from a failing scanner, so a repo without the plugins
//      on PATH — which is EVERY adopter's CI — got six red gates with an empty error message.
//   4. CI ran `npm run typecheck` unconditionally, a script `scriptsFor` deliberately omits for a
//      JavaScript repo. "Missing script: typecheck" on the first pull request.
//
// Each case below plants the exact condition. A suite that merely asserted "bootstrap exits 0" passed
// against all four of these at once.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { NPM_STUB_TEST, effectiveTestScript, scriptsFor } from "../plugins/harness-core/lib/configs.mjs";
import { mergePackageJson } from "../plugins/harness-core/lib/merge.mjs";
import { gateSpecFor } from "../plugins/harness-core/lib/detect.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATES = join(REPO, "plugins/harness-core/templates");
const STUB = 'echo "Error: no test specified" && exit 1';

const scratch = (files) => {
  const dir = mkdtempSync(join(tmpdir(), "cold-"));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), body);
  }
  return dir;
};
const pkgAt = (dir) => JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));

// ── 1 · the placeholder is not a decision ──────────────────────────────────────

test("npm's placeholder test script is displaced, and a real one never is", () => {
  const stubbed = scratch({ "package.json": JSON.stringify({ scripts: { test: STUB } }) });
  const r1 = mergePackageJson(stubbed, { scripts: scriptsFor({ sourceExt: ".js" }), devDependencies: {} });
  assert.equal(pkgAt(stubbed).scripts.test, "node --test", "the placeholder survived — verify is red on day one");
  assert.deepEqual(r1.replaced, ["test"], "a silent overwrite is worse than the bug it fixes");

  // The NEGATIVE CONTROL, and it is the one that matters: never-clobber is still the rule. A test
  // command someone actually wrote is untouchable, and a fix that ate it would be far worse than
  // the defect.
  const real = scratch({ "package.json": JSON.stringify({ scripts: { test: "vitest run" } }) });
  const r2 = mergePackageJson(real, { scripts: scriptsFor({ sourceExt: ".js" }), devDependencies: {} });
  assert.equal(pkgAt(real).scripts.test, "vitest run");
  assert.deepEqual(r2.replaced, []);
});

test("only the exact npm placeholder counts as one", () => {
  assert.ok(NPM_STUB_TEST.test(STUB));
  for (const real of ['echo "Error: no test specified"', "exit 1", "node --test", 'echo "no tests" && exit 0']) {
    assert.ok(!NPM_STUB_TEST.test(real), `${real} must not be treated as a placeholder`);
  }
  assert.equal(effectiveTestScript({ scripts: { test: STUB } }), null);
  assert.equal(effectiveTestScript({ scripts: { test: "vitest run" } }), "vitest run");
  assert.equal(effectiveTestScript({}), null);
});

// ── 2 · the runner is inferred from what the repo WILL have ────────────────────

test("a repo carrying only the placeholder gets the node --test gate, not a .ts one", () => {
  const dir = scratch({ "package.json": JSON.stringify({ type: "module", scripts: { test: STUB } }) });
  const spec = gateSpecFor(dir, {});
  assert.equal(spec.name, "gates.test.mjs", "a .spec.ts gate in a JS repo is collected by nothing");
  assert.match(spec.template, /gates\.test\.mjs$/);

  // Negative control: a repo with a REAL describe/it/expect runner still gets the .ts template, so
  // the fix did not simply hardcode node --test.
  const vitest = scratch({ "package.json": JSON.stringify({ scripts: { test: "vitest run" } }) });
  assert.match(gateSpecFor(vitest, {}).template, /gates\.spec\.ts$/);
});

// ── 3 · cannot measure is not a verdict ────────────────────────────────────────

test("the gate template SKIPS a scanner that is absent and FAILS one that found debt", () => {
  const dir = mkdtempSync(join(tmpdir(), "gates-"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }));
  mkdirSync(join(dir, "tests/arch"), { recursive: true });
  writeFileSync(join(dir, "tests/arch/gates.test.mjs"), readFileSync(join(TEMPLATES, "specs/gates.test.mjs")));

  // PLANT A: nothing on PATH. Six gates, nothing measured — must not render a verdict either way.
  // PATH is emptied of everything but node itself — the scanners must be unreachable while the
  // runner still starts. Pointing PATH at nothing would fail to spawn node and prove nothing.
  // NODE_TEST_CONTEXT must be stripped: node's runner sets it for its own children, and an inner
  // run that inherits it switches to the serialized child protocol — no "# skipped" summary at all,
  // so the assertions below would be reading the wrong format rather than the wrong outcome.
  //
  // `--test-reporter=tap` is pinned for the same reason, one layer up, and CI is what taught it: the
  // default reporter changes with the node version — the runner emitted `ℹ skipped 6` where this
  // machine emits `# skipped 6` — so an assertion on the default format tests the toolchain rather
  // than the behaviour. It went red on a run where the behaviour was exactly right. Pin the format
  // and the assertion means what it says.
  const bare = { ...process.env, PATH: dirname(process.execPath) };
  delete bare.NODE_TEST_CONTEXT;
  delete bare.NODE_OPTIONS;
  const absent = execFileSync(process.execPath, ["--test", "--test-reporter=tap"], { cwd: dir, encoding: "utf8", env: bare });
  assert.match(absent, /# skipped 6/, "a missing scanner must not report a pass or a failure");
  assert.match(absent, /NOTHING WAS MEASURED/, "a skip nobody can see the reason for is a false green");
  assert.doesNotMatch(absent, /# fail [1-9]/);

  // PLANT B: scanners present and one is genuinely over budget. This is the case the ENOENT branch
  // must not swallow — without it, the fix above would have turned every real finding into a skip.
  const bin = join(dir, "fakebin");
  mkdirSync(bin, { recursive: true });
  for (const name of ["harness-arch-scan", "harness-dupe-scan", "harness-dead-scan", "harness-spec-gap-scan", "harness-clone-scan", "harness-incident-scan"]) {
    const over = name === "harness-arch-scan";
    writeFileSync(join(bin, name), `#!/bin/sh\n${over ? 'echo "3 files over budget"; exit 1' : "exit 0"}\n`);
    chmodSync(join(bin, name), 0o755);
  }
  let failed = "";
  try {
    execFileSync(process.execPath, ["--test", "--test-reporter=tap"], { cwd: dir, encoding: "utf8", env: { ...bare, PATH: `${bin}:${bare.PATH}` } });
    assert.fail("a scanner that ran and found debt must fail the suite");
  } catch (err) {
    failed = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
  assert.match(failed, /# fail 1/);
  assert.match(failed, /3 files over budget/, "the finding must reach the adopter, not just a red mark");
  assert.match(failed, /# pass 5/, "the other five ran and passed — the ENOENT branch must not swallow real runs");
});

// ── 4 · CI must not run a script the harness chose not to write ────────────────

test("no CI step invokes a script scriptsFor omits for a JavaScript repo", () => {
  const workflow = readFileSync(join(TEMPLATES, "github/workflows/harness.yml"), "utf8");
  const js = scriptsFor({ sourceExt: ".js" }, { hasTsconfig: false });
  assert.equal(js.typecheck, undefined, "the premise of this test changed — a JS repo now gets a typecheck");

  for (const m of workflow.matchAll(/run: npm run ([a-z:-]+)(.*)$/gm)) {
    const [, script, rest] = m;
    if (script in js) continue;
    assert.match(rest, /--if-present/, `CI runs \`npm run ${script}\`, which a JavaScript adoption does not have`);
  }
});

// ── 5 · the descriptor is detected, never assumed ──────────────────────────────

test("a JavaScript repo is not handed a descriptor claiming TypeScript", async () => {
  // The worst defect this bootstrap could ship, and it did. Every scanner reads the descriptor to
  // decide what to look at, so a `.ts` claim in a `.js` repo made every gate glob for files that do
  // not exist, find nothing, and report GREEN — permanently, on a repository with real debt.
  //
  // A gate scanning zero files does not look broken. It looks clean. That is the false green this
  // project exists to prevent, installed by its own one-shot as the default state.
  const fs = await import("node:fs");
  const { renderDescriptor } = await import("../plugins/harness-core/lib/configs.mjs");

  const js = scratch({ "src/index.js": "export const a = 1;\n", "src/b.js": "export const b = 2;\n", "tests/a.test.mjs": "" });
  const d = JSON.parse(renderDescriptor(js, fs));
  assert.equal(d.sourceExt, ".js", "every gate would scan zero files and report green");
  assert.equal(d.specSuffix, ".test.mjs", "a .spec.ts suffix in a JS repo is a gate file nothing collects");

  // Negative control: a TypeScript repo must still be read as TypeScript, or the fix just moved the
  // failure to the other language.
  const ts = scratch({ "src/index.ts": "export const a = 1;\n", "src/b.ts": "export const b = 2;\n" });
  assert.equal(JSON.parse(renderDescriptor(ts, fs)).sourceExt, ".ts");

  // Mixed: the majority wins, and it is counted rather than guessed from the first file seen.
  const mixed = scratch({ "src/one.ts": "", "src/two.js": "", "src/three.js": "", "src/four.js": "" });
  assert.equal(JSON.parse(renderDescriptor(mixed, fs)).sourceExt, ".js");

  // A non-default layout is DETECTED too — that is the whole portability claim.
  const lib = scratch({ "lib/index.js": "", "spec/x.test.mjs": "" });
  const l = JSON.parse(renderDescriptor(lib, fs));
  assert.equal(l.sourceDir, "lib");
  assert.equal(l.testDir, "spec");

  // Nothing to detect means the DOCUMENTED default, never a guess dressed as a measurement.
  assert.equal(JSON.parse(renderDescriptor(scratch({ "package.json": "{}" }), fs)).sourceExt, ".ts");
});

test("the generated gate spec survives the linter and the runner the same run installs", () => {
  // Two defects, one file, both self-inflicted by this bootstrap on its own output.
  const biome = JSON.parse(readFileSync(join(TEMPLATES, "node/biome.json"), "utf8"));
  const spec = readFileSync(join(TEMPLATES, "specs/gates.spec.ts"), "utf8");
  const mjs = readFileSync(join(TEMPLATES, "specs/gates.test.mjs"), "utf8");

  // The ENOENT branch needs to say NOTHING WAS MEASURED out loud, and biome.json ships
  // `noConsole: "error"` — so the file the bootstrap wrote failed the linter it also wrote.
  assert.match(spec, /console\.warn/);
  const off = biome.overrides.find((o) => o.linter?.rules?.suspicious?.noConsole === "off");
  assert.ok(off?.includes?.some((g) => /arch\/gates/.test(g)), "the gate spec must be exempt from noConsole, or it is red on the first verify");

  // Vitest does not inject describe/it unless `globals: true`, which most projects do not set — so
  // this referenced two identifiers that did not exist. Importing is correct in every case rather
  // than in most of them.
  assert.match(spec, /^import \{ describe, it \} from "vitest";$/m, "describe/it must be imported, not assumed global");
  assert.match(mjs, /from "node:test"/, "and the node flavour must import its own");
});

// ── 6 · one Node version, declared in three places ─────────────────────────────

test("nvmrc, CI and engines agree on the Node version", () => {
  // `engines` said ">=22" while .nvmrc and CI both pinned 24 — a floor nothing tests, published as a
  // requirement. The first person to read it asked why they were being told to install dated
  // software, which is the right question: a claim the suite never exercises is a claim, not a fact.
  //
  // The invariant is agreement rather than a number, so bumping Node stays a one-line change instead
  // of a scavenger hunt across three files that fail at different times and in different places.
  const pinned = readFileSync(join(REPO, ".nvmrc"), "utf8").trim();
  assert.match(pinned, /^\d+$/, ".nvmrc must pin a bare major");

  const engines = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8")).engines?.node ?? "";
  assert.equal(engines, `>=${pinned}`, `engines says "${engines}" but .nvmrc pins ${pinned} — the floor must be what is actually tested`);

  for (const m of readFileSync(join(REPO, ".github/workflows/pipeline.yml"), "utf8").matchAll(/node-version:\s*'?(\d+)'?/g)) {
    assert.equal(m[1], pinned, `CI runs Node ${m[1]} while .nvmrc pins ${pinned}`);
  }

  // And the shipped workflow must read the file rather than hardcode a number, or every adopter
  // inherits ours and finds out when it is wrong for them.
  const shipped = readFileSync(join(TEMPLATES, "github/workflows/harness.yml"), "utf8");
  assert.match(shipped, /node-version-file:\s*'\.nvmrc'/, "the shipped pipeline must take the version from the adopter's .nvmrc");
  assert.doesNotMatch(shipped, /node-version:\s*'?\d/, "a hardcoded Node version in the shipped workflow is our opinion imposed as their requirement");
});

// ── 7 · the first-app walkthrough is a complete arc ────────────────────────────

test("FIRST-APP.md walks the whole journey, and every command in it is real", () => {
  // The version before this pointed at the pipeline instead of walking it, so someone who followed
  // the advice landed on a working app with no idea how to get it anywhere. The arc is the product
  // here: app → repository → pipeline → one full loop → their own ideas. Losing any leg leaves
  // somebody stranded at exactly the step they could not have done alone.
  const doc = readFileSync(join(TEMPLATES, "starter/FIRST-APP.md"), "utf8");
  for (const [leg, cue] of [
    ["something on screen", /index\.html/],
    ["make it theirs", /change how it looks|Make it yours/i],
    ["a real dev server", /npx serve/],
    ["their own backlog", /localStorage/],
    ["a repository", /github\.com\/new/],
    ["the pipeline", /harness-bootstrap --auto/],
    ["one change all the way round", /pull request/i],
    ["the deliberate failure", /break(ing)? .*on purpose|Do not skip this one/i],
    ["the three features", /\*\*edit\*\* a to-do item/],
    // The segue is a STRUCTURE, not a sentence: the last section points back at the list their own
    // use generated in step 4. Pinning its wording is what broke this assertion once already.
    ["the segue out", /Look back at the list you wrote/],
  ]) {
    assert.match(doc, cue, `the walkthrough lost its "${leg}" leg — that strands someone mid-journey`);
  }

  // The credentialed steps must be named as such. A beginner who cannot do a step, and was not told
  // it needs rights they may not have, concludes the fault is theirs.
  assert.match(doc, /admin/i, "the owner-only steps must be flagged, or a beginner reads them as their own failure");
  assert.match(doc, /green once/, "turning the ruleset on before verify has reported is the deadlock this must warn about");

  // The paste it hands over must be the same one the README ships. Two divergent copies of the
  // setup instruction is the drift this project exists to prevent, in the one file read by the
  // person least able to spot it.
  const readme = readFileSync(join(REPO, "README.md"), "utf8");
  const canon = [...readme.matchAll(/```\n(Set up the dungeon-crawler[\s\S]*?)```/g)][0]?.[1];
  assert.ok(canon, "the README's setup prompt moved — this test pins the walkthrough against it");
  assert.ok(doc.includes(canon.trim()), "FIRST-APP.md ships a DIFFERENT setup prompt from the README");
});

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

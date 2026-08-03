// CONFIG RATCHETS — and the three cases that decide whether this gate is usable.
//
// A config gate is the easiest of all to switch off, so the load-bearing tests are not the refusals.
// They are: an existing weaker repository is GRANDFATHERED rather than condemned, a loosening is
// caught, and a tightening ratchets. Get the first one wrong and nobody ever reaches the other two.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { disabledRules, lockedViolations, measure, at } from "../plugins/harness-gates/lib/sanitation.mjs";
import { HarnessProject } from "../projen/index.mjs";

const SCANNER = join(import.meta.dirname, "../plugins/harness-gates/lib/sanitation.mjs");
const scratch = () => mkdtempSync(join(tmpdir(), "harness-sanit-"));

/** Run the gate the way a consumer's `npm test` would, and report its REAL exit code. */
function runGate(cwd, args = []) {
  try {
    execFileSync(process.execPath, [SCANNER, ...args], { cwd, encoding: "utf8", stdio: "pipe" });
    return { code: 0 };
  } catch (err) {
    return { code: err.status, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

const biome = (dir, config) => writeFileSync(join(dir, "biome.json"), JSON.stringify(config, null, 2));
const SANE = { linter: { enabled: true, rules: {} }, formatter: { enabled: true } };

/** A sane config with N suspicious rules switched off — the only axis these cases vary. */
const withDisabled = (...names) => ({
  ...SANE,
  linter: { enabled: true, rules: { suspicious: Object.fromEntries(names.map((n) => [n, "off"])) } },
});

test("disabled rules are counted wherever they hide, including inside overrides", () => {
  const count = disabledRules({
    linter: { rules: { suspicious: { noConsole: "off" }, style: { noDefaultExport: "error" } } },
    overrides: [{ linter: { rules: { correctness: { noUnusedImports: "off" } } } }],
  });
  assert.deepEqual(count.sort(), ["linter.rules.suspicious.noConsole", "overrides[0].correctness.noUnusedImports"]);
});

test("LOCKED catches a linter switched off — a green check that measures nothing", () => {
  const dir = scratch();
  biome(dir, { ...SANE, linter: { enabled: false, rules: {} } });
  const found = lockedViolations(dir);
  assert.equal(found.length, 1);
  assert.equal(found[0].path, "linter.enabled");
  assert.ok(found[0].why.length > 0, "a refusal must say why or it reads as the tool being broken");
});

test("an absent config is UNMEASURED, never a pass", () => {
  assert.deepEqual(lockedViolations(scratch()), [], "silence, not a verdict");
  assert.equal(measure(scratch()).measured, false);
});

test("GRANDFATHERS — an existing weaker repo is frozen, not condemned", () => {
  const dir = scratch();
  biome(dir, withDisabled("noConsole", "useAwait"));

  // No committed budget. Two rules already off, shipped long before this gate existed.
  assert.equal(runGate(dir).code, 0, "day one must not be red for work somebody already shipped");
});

test("a LOOSENING is caught once the budget exists", () => {
  const dir = scratch();
  biome(dir, withDisabled("noConsole"));
  runGate(dir, ["--update"]);
  assert.equal(JSON.parse(readFileSync(join(dir, "config-budget.json"), "utf8")).disabledRules, 1);

  biome(dir, withDisabled("noConsole", "useAwait"));
  const run = runGate(dir);
  assert.equal(run.code, 1, "turning another rule off must not land quietly");
  assert.match(run.out, /2 rule\(s\) disabled \(budget 1\)/);
});

test("a TIGHTENING passes, and --update ratchets DOWN only", () => {
  const dir = scratch();
  biome(dir, withDisabled("noConsole", "useAwait"));
  runGate(dir, ["--update"]);

  biome(dir, withDisabled("noConsole"));
  assert.equal(runGate(dir).code, 0, "improving must never be a failure");

  runGate(dir, ["--update"]);
  assert.equal(JSON.parse(readFileSync(join(dir, "config-budget.json"), "utf8")).disabledRules, 1);

  // The ratchet is one-way: re-running --update on a WORSE config must not raise it back.
  biome(dir, withDisabled("noConsole", "useAwait"));
  runGate(dir, ["--update"]);
  assert.equal(
    JSON.parse(readFileSync(join(dir, "config-budget.json"), "utf8")).disabledRules,
    1,
    "improvement is permanent",
  );
});

test("synthesis REFUSES a locked violation, naming which principle and why", () => {
  const dir = scratch();
  process.env.PROJEN_DISABLE_POST = "true"; // projen's own post step runs `npm install` first and would mask this
  const project = new HarnessProject({ outdir: dir, name: "weakened", defaultReleaseBranch: "main", harnessRef: "v9.9.9" });

  // The consumer reaches for the documented escape hatch and turns the linter off.
  project.tryFindObjectFile("biome.json").addOverride("linter.enabled", false);
  project.synth();

  const sanitation = project.components.find((c) => c.constructor.name === "SanitationComponent");
  assert.ok(sanitation, "the component must actually be wired into HarnessProject, not merely exist");

  // The hook, run against the FINAL rendered state — which is the only point a consumer's override
  // is visible, and the reason this tier is enforced here rather than in CI.
  assert.throws(() => sanitation.postSynthesize(), (err) => {
    assert.match(err.message, /sanitation refused/);
    assert.match(err.message, /linter\.enabled/, "the refusal must name the principle");
    assert.match(err.message, /measures nothing/, "and say why, or it reads as the tool being broken");
    return true;
  });
});

test("a conforming project's sanitation hook is silent", () => {
  const dir = scratch();
  process.env.PROJEN_DISABLE_POST = "true";
  const project = new HarnessProject({ outdir: dir, name: "sane", defaultReleaseBranch: "main", harnessRef: "v9.9.9" });
  project.synth();

  const sanitation = project.components.find((c) => c.constructor.name === "SanitationComponent");
  assert.doesNotThrow(() => sanitation.postSynthesize());
});

test("dotted lookup survives a missing branch rather than throwing", () => {
  assert.equal(at({ a: { b: 1 } }, "a.b"), 1);
  assert.equal(at({}, "a.b.c"), undefined);
});

test("this repository's own biome config passes its own locked tier", () => {
  const root = join(import.meta.dirname, "..");
  assert.deepEqual(
    lockedViolations(root),
    [],
    "a harness that fails its own principles has no business imposing them",
  );
});

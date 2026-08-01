import assert from "node:assert/strict";
import { test } from "node:test";
import { exercisedByExecution, launcherAliases } from "../plugins/harness-gates/lib/references.mjs";
import { makeRepo } from "./helpers.mjs";

// The spec-gap gate's second relationship: a spec that RUNS a thin launcher is exercising the module
// that launcher execs. Getting this wrong in either direction is expensive — too loose and the gate
// credits code nothing touches; too tight and it reports a repository of commands as wholly untested,
// which is the bug that motivated this module.

const LAUNCHER = `#!/bin/sh
DIR=$(cd -- "$(dirname -- "$0")" && pwd -P)
exec node "$DIR/../lib/arch-scan.mjs" "$@"
`;

const repoWithLauncher = () =>
  makeRepo({
    "plugins/harness-gates/bin/harness-arch-scan": LAUNCHER,
    "plugins/harness-gates/lib/arch-scan.mjs": "export const x = 1;\n",
  });

test("a launcher maps to the module it execs", () => {
  const aliases = launcherAliases(repoWithLauncher(), "plugins");
  assert.deepEqual(aliases.get("harness-arch-scan"), ["plugins/harness-gates/lib/arch-scan.mjs"]);
});

test("a launcher naming a module that does not exist maps to nothing", () => {
  const root = makeRepo({
    "plugins/harness-gates/bin/harness-ghost": '#!/bin/sh\nexec node "$DIR/../lib/ghost.mjs" "$@"\n',
  });
  assert.equal(launcherAliases(root, "plugins").has("harness-ghost"), false);
});

test("only directories literally named bin contribute aliases", () => {
  const root = makeRepo({
    "plugins/harness-gates/scripts/harness-arch-scan": LAUNCHER,
    "plugins/harness-gates/lib/arch-scan.mjs": "export const x = 1;\n",
  });
  assert.equal(launcherAliases(root, "plugins").size, 0);
});

test("a spec that runs the launcher exercises its module", () => {
  const aliases = launcherAliases(repoWithLauncher(), "plugins");
  const hit = exercisedByExecution('runTool(bin("harness-gates", "harness-arch-scan"), root);', aliases);
  assert.deepEqual([...hit], ["plugins/harness-gates/lib/arch-scan.mjs"]);
});

test("a near-miss command name does not count", () => {
  // `harness-arch-scanner` is a different command. Crediting a prefix match would silently re-open
  // exactly the hole this closes — the gate would score a module tested because of a typo.
  const aliases = launcherAliases(repoWithLauncher(), "plugins");
  assert.equal(exercisedByExecution("runTool(bin('x', 'harness-arch-scanner'))", aliases).size, 0);
});

test("a spec that mentions no launcher exercises nothing", () => {
  const aliases = launcherAliases(repoWithLauncher(), "plugins");
  assert.equal(exercisedByExecution("assert.equal(1, 1);", aliases).size, 0);
});

test("a missing source tree is empty, not a crash", () => {
  assert.equal(launcherAliases(makeRepo({}), "plugins").size, 0);
});

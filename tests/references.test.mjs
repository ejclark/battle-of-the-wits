import assert from "node:assert/strict";
import { test } from "node:test";
import { exercisedByExecution, launcherAliases } from "../plugins/harness-gates/lib/references.mjs";
import { makeRepo } from "./helpers.mjs";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

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

test("every file a diagram names is a file that exists", () => {
  // A diagram is a claim about how this project is put together, and it goes stale exactly the way
  // prose does — except nobody re-reads a picture they have already understood once. The nodes name
  // real modules; if one is renamed and the diagram is not, this is what says so.
  //
  // Deliberately not a check that the ARROWS are right: no test can know that, and pretending to
  // would be worse than the gap. What it can check is that the boxes point at things.
  const docs = ["CONTRIBUTING.md", "README.md", "docs/ROADMAP.md"];
  let checked = 0;
  for (const doc of docs) {
    const body = readFileSync(join(REPO, doc), "utf8");
    for (const block of [...body.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1])) {
      for (const file of block.match(/[\w./-]+\.mjs\b/g) ?? []) {
        // Bare module names in a label — resolve them against the places modules live here.
        const candidates = [
          join(REPO, file),
          join(REPO, "plugins/harness-core/lib", file),
          join(REPO, "plugins/harness-gates/lib", file),
        ];
        assert.ok(candidates.some((p) => existsSync(p)), `a diagram in ${doc} names "${file}", which does not exist`);
        checked++;
      }
      // A fenced mermaid block that declares no diagram type is a broken render on GitHub, and it
      // looks like a code block full of arrows rather than an error anybody would notice.
      assert.match(block.trim(), /^(flowchart|graph|sequenceDiagram|stateDiagram|classDiagram|erDiagram|journey|gantt|pie|mindmap|timeline)\b/, `a mermaid block in ${doc} has no diagram type`);
    }
  }
  assert.ok(checked > 0, "this test found no diagram files to check — it has stopped testing anything");
});

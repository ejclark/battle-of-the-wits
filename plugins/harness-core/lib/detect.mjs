// Repo state detection — the single question "what has actually been done here?"
//
// Split out of phases.mjs because that file had grown to hold two jobs: reading the world, and
// describing the route through it. The architecture gate caught the growth and refused to raise its
// own budget (--update only ever lowers), which is the ratchet doing exactly what it is for — the
// fix is the decomposition it was pointing at, not a negotiated number.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BUDGETS = [
  "arch-budget.json",
  "dupe-budget.json",
  "dead-budget.json",
  "spec-gap-budget.json",
  "clone-budget.json",
];

/** Look at the repo and work out what has actually been done, rather than asking. */
export function detect(root) {
  const has = (p) => existsSync(join(root, p));

  const pkg = (() => {
    try {
      return JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    } catch {
      return null;
    }
  })();

  const descriptor = (() => {
    try {
      return JSON.parse(readFileSync(join(root, "harness.json"), "utf8"));
    } catch {
      return null;
    }
  })();

  const testDir = descriptor?.testDir ?? "tests";

  // What counts as "installed" is the LOAD-BEARING set, not the full opinion set. Biome and husky
  // are recommendations a repo may decline; keying depth on them reported a fully-wired harness as
  // being still at the door. Depth must track the harness, not the preferences.
  const gatesWired = has(join(testDir, "arch/gates.spec.ts")) || has(join(testDir, "arch/gates.test.mjs"));
  const wantsHusky = /husky/.test(pkg?.scripts?.prepare ?? "");

  return {
    filesWritten: has("harness.json") && gatesWired && has(".github/workflows/pipeline.yml"),
    installed: has("node_modules"),
    // A repo that never opted into husky cannot be blocked on husky being live.
    hooksLive: wantsHusky ? has(".husky/_") : true,
    budgetsFrozen: BUDGETS.some((b) => has(b)),
    budgetsAll: BUDGETS.filter((b) => has(b)),
    budgetsMissing: BUDGETS.filter((b) => !has(b)),
    gatesWired,
    ledger: has("docs/LESSONS.md"),
    hasVerify: Boolean(pkg?.scripts?.verify),
  };
}

/**
 * Which gate spec to write, and under which filename. `node --test` provides `test()` but NOT
 * `expect`; Vitest/Rstest/Jest provide describe/it/expect. Getting it wrong is the worst failure
 * this bootstrap can have — a gate file the runner never discovers reports nothing, silently.
 */
export function gateSpecFor(root, descriptor = null) {
  const pkg = (() => {
    try {
      return JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    } catch {
      return {};
    }
  })();
  const nodeTest = /\bnode\s+--test\b/.test(pkg.scripts?.test ?? "");
  const template = nodeTest ? "specs/gates.test.mjs" : "specs/gates.spec.ts";

  // The FILENAME comes from the repo's own spec suffix, not the template's: the runner decides which
  // globals exist, the suffix decides whether the file is collected at all. A repo globbing
  // `spec/**/*.test.js` was handed `gates.test.mjs` and never saw it — gates reporting nothing while
  // the suite stayed green, which is the worst failure this bootstrap has.
  const suffix = specSuffixFor(root, descriptor, nodeTest);
  return { template, name: `gates${suffix}` };
}

/**
 * The suffix a spec must carry in THIS repo for its own test command to collect it. The descriptor is
 * passed IN rather than read from disk: the bootstrap writes a default `harness.json` before wiring
 * the gates, so re-reading would pick up the template's `.spec.ts` — an opinion the repo never had.
 */
function specSuffixFor(root, descriptor, nodeTest) {
  const declared = descriptor?.specSuffix ?? null;
  if (!declared) return nodeTest ? ".test.mjs" : ".spec.ts";

  // `.js` in a CommonJS package cannot hold the ESM the template is written in, so `.mjs` is the only
  // correct extension even though it will not be collected: a file that throws on import is loud.
  const esm = /\.mjs$/.test(declared) || readPkgType(root) === "module";
  return esm ? declared : declared.replace(/\.js$/, ".mjs");
}

function readPkgType(root) {
  try {
    return JSON.parse(readFileSync(join(root, "package.json"), "utf8")).type;
  } catch {
    return undefined;
  }
}

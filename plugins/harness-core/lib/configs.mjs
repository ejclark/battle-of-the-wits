// The two adopted tools' configs, RENDERED from the capability descriptor rather than copied.
//
// `knip` and `jscpd` are the only gates whose detector is a third-party tool, which means they are
// the only two whose scope is decided by a config file rather than by the scanner's own code. Every
// scanner was made descriptor-aware months ago — and these two files were not, so a repository that
// declared `sourceDir: "lib"` got scanners looking at `lib/` and detectors looking at `src/`. The
// gate reports a confident zero and the adopter is measured on an empty directory.
//
// That failure is silent in the worst way: an empty scope produces no findings, no findings looks
// like a clean repository, and a clean repository is exactly the answer nobody questions. It is the
// same bug that made the scanners themselves report 1 file of 10 in an `.mjs` codebase — fixed
// there, left standing one layer down in the config they depend on.
//
// So these are templates only in spirit. The shape is fixed here; every path in it comes from the
// descriptor, so there is no copy to drift.

// `renderDescriptor` needs to know what the repo's test script really is — script-domain knowledge,
// which lives in scripts.mjs since the split. The dependency runs one way only; scripts.mjs imports
// nothing.
import { effectiveTestScript } from "./scripts.mjs";

/** Extension without the leading dot — `.ts` → `ts`. */
const ext = (e) => e.replace(/^\./, "");

/**
 * knip.json — the dead-code detector's module graph.
 *
 * Entry points are the honest hard part: knip needs to know what is legitimately reachable from
 * outside the graph (CLI mains, hook scripts, specs), and getting that wrong reports live code as
 * dead. The generated set covers the conventional shapes; an adopter with an unusual entry point
 * edits the file, which is why it is written once rather than regenerated.
 */
export function renderKnip(desc = {}) {
  const src = desc.sourceDir ?? "src";
  const tests = desc.testDir ?? "tests";
  const e = ext(desc.sourceExt ?? ".ts");
  const spec = desc.specSuffix ?? ".spec.ts";
  return `${JSON.stringify(
    {
      $schema: "https://unpkg.com/knip@6/schema.json",
      entry: [`${src}/scripts/*.${e}`, "scripts/*.mjs", `${tests}/**/*${spec}`],
      project: [`${src}/**/*.${e}`, "scripts/*.mjs"],
      ignore: desc.exclude ?? [],
      ignoreDependencies: ["@commitlint/config-conventional", "husky"],
    },
    null,
    2,
  )}\n`;
}

/**
 * .jscpd.json — the copy-paste detector's scope.
 *
 * `path` matters more here than anywhere else: jscpd defaults to the whole working tree, so an
 * unscoped run measures the lockfile against itself and reports a repository as heavily duplicated
 * on the strength of `node_modules` metadata. This harness shipped without the file at all for a
 * while and did exactly that.
 */
export function renderJscpd(desc = {}) {
  const src = desc.sourceDir ?? "src";
  const spec = desc.specSuffix ?? ".spec.ts";
  return `${JSON.stringify(
    {
      path: [src],
      // Specs are excluded because near-identical arrange/act/assert blocks are what a good suite
      // LOOKS like — flagging them trains people to write worse tests to satisfy a counter.
      ignore: ["**/node_modules/**", `**/*${spec}`, "**/*.d.ts", ...(desc.exclude ?? []).map((p) => `${p.replace(/\/$/, "")}/**`)],
      minTokens: 50,
      reporters: ["json"],
      absolute: false,
      gitignore: true,
      threshold: 100,
    },
    null,
    2,
  )}\n`;
}

/**
 * harness.json — RENDERED from what the repository actually is, never copied from a template.
 *
 * THE WORST FAILURE THIS BOOTSTRAP CAN PRODUCE, and it shipped. A static template declared
 * `sourceExt: ".ts"`, so adopting into a JavaScript repo wrote a descriptor claiming TypeScript.
 * Every scanner reads that descriptor to decide what to look at, so every gate globbed `**` + `.ts`,
 * found NOTHING, and reported green — permanently, on a repository with real debt in it.
 *
 * A gate scanning zero files does not look broken. It looks clean. That is the false green this
 * entire project exists to prevent, installed by its own one-shot as the default state.
 *
 * Detection is deliberately dumb — count the files, take the majority — because a clever inference
 * that is wrong is worse than a simple one that is obviously wrong. Nothing to detect means the
 * DOCUMENTED default, never a guess dressed as a measurement.
 */
export function renderDescriptor(root, { readdirSync, existsSync, readFileSync }) {
  const readPkg = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "{}");
  const first = (candidates, fallback) => candidates.find((d) => existsSync(`${root}/${d}`)) ?? fallback;
  const sourceDir = first(["src", "lib", "app", "packages"], "src");

  // Majority extension among source files, walking at most a few levels — enough to classify a
  // repository, cheap enough to run during a bootstrap.
  const counts = {};
  const walk = (dir, depth) => {
    if (depth > 4 || !existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const full = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(full, depth + 1);
      else {
        const ext = e.name.match(/(\.[cm]?[jt]sx?)$/)?.[1];
        if (ext) counts[ext.replace(/^\.[cm]/, ".")] = (counts[ext.replace(/^\.[cm]/, ".")] ?? 0) + 1;
      }
    }
  };
  walk(`${root}/${sourceDir}`, 0);
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const sourceExt = ranked.length ? ranked[0][0].replace(/x$/, "") : ".ts";

  const testDir = first(["tests", "test", "spec", "__tests__"], "tests");

  // The suffix must match the RUNNER, not just the language. `scriptsFor` writes `node --test` for a
  // repo with no real test script, and `node --test` collects `*.test.mjs` — so a `.spec.ts` suffix
  // here names a gate file that runner will never look at. Language decides the template; the runner
  // decides whether the file is collected at all, and getting that wrong is the silent one.
  let realTest = null;
  try {
    realTest = effectiveTestScript(JSON.parse(readPkg(`${root}/package.json`)));
  } catch (err) {
    // NARROWED, because the broad form already cost a silent defect. Splitting `effectiveTestScript`
    // into its own module left this call with no import, and the bare `catch` turned that
    // ReferenceError into `realTest = null` — which is a legitimate value here. So a crash became a
    // repo that "has no test script", the suffix flipped to `.test.mjs`, and the gate file was named
    // for a runner the repo does not use. Wrong data, no error, and only a planted test caught it.
    //
    // A missing or malformed package.json is the case this was written for and stays tolerated. A
    // ReferenceError or TypeError is a defect in THIS file and must be loud.
    if (err instanceof ReferenceError || err instanceof TypeError) throw err;
    realTest = null;
  }
  const typescript = sourceExt === ".ts" && realTest !== null && !/\bnode\s+--test\b/.test(realTest);
  return `${JSON.stringify(
    {
      persona: "dungeon",
      sourceDir,
      testDir,
      sourceExt,
      specSuffix: typescript ? ".spec.ts" : ".test.mjs",
      specExempt: [],
      exclude: [],
      fleet: { maxConcurrent: 3, tokenCeiling: null },
    },
    null,
    2,
  )}\n`;
}

/**
 * rstest.config.ts — the test runner's scope, rendered from the descriptor.
 *
 * Same reasoning as `renderKnip` and `renderJscpd`: a runner pointed at a spec glob that does not
 * match this repo's layout collects zero tests and reports a green suite, which is the false green
 * this project exists to prevent. So `testDir` and `specSuffix` come from the descriptor rather than
 * from an assumption that everyone uses `tests/**\/*.spec.ts`.
 */
export function renderRstest(desc = {}) {
  const tests = desc.testDir ?? "tests";
  const spec = desc.specSuffix ?? ".spec.ts";
  return `import { defineConfig } from "@rstest/core";

// Generated from harness.json — edit .projenrc.ts, not this file.
export default defineConfig({
  globals: true,
  testEnvironment: "node",
  include: ["${tests}/**/*${spec}"],
});
`;
}

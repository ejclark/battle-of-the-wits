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

/** Extension without the leading dot — `.ts` → `ts`. */
const ext = (e) => e.replace(/^\./, "");

// WHAT `npm init` WRITES IS NOT A DECISION SOMEONE MADE.
//
// The never-clobber rule is right, and this is the one place it was wrong. `npm init -y` seeds
// `"test": "echo \"Error: no test specified\" && exit 1"`, and the bootstrap read that as a choice to
// be respected — so a cold adoption left the adopter's very first `npm run verify` RED, on a script
// the harness itself had just wired into `verify`.
//
// Worse, the damage was not confined to `verify`. `gateSpecFor` infers the test RUNNER from this same
// string; the placeholder does not match `node --test`, so it concluded describe/it/expect, wrote
// `gates.spec.ts` into a plain JavaScript repository, and the gate file was never collected by
// anything. Gates present, gates inert, suite green — the exact false green this project exists to
// prevent, produced by its own bootstrap for the third recorded time.
//
// One string, three failures. So the placeholder is recognised in ONE place and both readers consult
// it. It is matched EXACTLY: a test script an adopter actually wrote is still untouchable.
export const NPM_STUB_TEST = /^echo\s+"Error: no test specified"\s*&&\s*exit\s+1\s*$/;

/** The test command this repo really has — treating npm's placeholder as the absence it is. */
export function effectiveTestScript(pkg = {}) {
  const declared = pkg?.scripts?.test;
  return declared && !NPM_STUB_TEST.test(declared) ? declared : null;
}

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
 * The scripts table the bootstrap merges into `package.json`.
 *
 * `typecheck` is CONDITIONAL, and finding that out cost the first adoption into a repository shaped
 * differently from this one. A JavaScript project got `tsc -p tsconfig.json --noEmit` and a `verify`
 * that ran it, so the adopter's very first `npm run verify` failed — on a file they do not have, for
 * a language they do not use, in a script the harness had just written for them.
 *
 * That is the same failure the grandfather step exists to prevent, one layer up: go red immediately
 * for something nobody caused, and the whole process gets switched off before it has proved anything.
 * The descriptor already says `sourceExt`; there was no excuse for guessing.
 */
export function scriptsFor(desc = {}, { hasTsconfig = true } = {}) {
  // THE SAME BUG, ONE LEVEL DOWN — and it shipped twice.
  //
  // The recorded fix for the first adoption was to stop guessing the LANGUAGE: read `sourceExt`
  // rather than assume TypeScript. That was necessary and insufficient. Knowing the language does
  // not tell you the toolchain is configured, and a repository can perfectly well hold `.ts` files
  // with no `tsconfig.json` — mid-setup, bundler-managed, or config under another name.
  //
  // Run end-to-end from zero, `--auto` wrote a verify containing `tsc -p tsconfig.json --noEmit`
  // into exactly that repo, and the adopter's FIRST verify failed with TS5058 on a file they do not
  // have, in a script the harness had just written them. Same first impression, same lesson, second
  // time.
  //
  // So the rule generalises past `sourceExt`: **do not emit a command whose config does not exist.**
  // Omitting it silently would be the other failure — a verify that passes because it stopped
  // checking — so the caller is told, and says so.
  const typescript = (desc.sourceExt ?? ".ts") === ".ts";
  const typecheck = typescript && hasTsconfig;
  const checks = [typecheck ? "npm run typecheck" : null, "npm run lint", "npm test"].filter(Boolean);
  return {
    ...(typecheck ? { typecheck: "tsc -p tsconfig.json --noEmit" } : {}),
    // Offered, not imposed: `mergePackageJson` keeps a real test script and only displaces npm's
    // placeholder. `node --test` is the zero-dependency choice — nothing to install, and it exits 0
    // on a repo with no tests yet, so day one is green rather than red-for-no-reason.
    test: "node --test",
    lint: "biome check .",
    "lint:fix": "biome check --write .",
    format: "biome format --write .",
    verify: checks.join(" && "),
    prepare: "husky",
    "arch:scan": "harness-arch-scan",
    "dupe:scan": "harness-dupe-scan",
    "dead:scan": "harness-dead-scan",
    "spec:gap": "harness-spec-gap-scan",
    "clone:scan": "harness-clone-scan",
    "incident:scan": "harness-incident-scan",
  };
}

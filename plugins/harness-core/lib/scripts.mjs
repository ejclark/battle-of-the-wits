// WHAT `package.json` SCRIPTS A REPOSITORY GETS — and what npm's placeholder is not.
//
// Split out of `configs.mjs` when the architecture gate caught that file going over budget. The seam
// is a real one rather than a line count: `configs.mjs` RENDERS a tool's config file from the
// descriptor, and this decides what commands land in `package.json`. Two jobs that happened to share
// a module, and only one of them is about a file on disk.

/**
 * The gate commands, as PLAIN npm scripts pointing at `node_modules/.bin`.
 *
 * Not projen Tasks — that costs +590ms per invocation (docs/adr/0001). And not `npx harness-…`
 * either: `npx` re-resolves the package every time, which is a network round trip on a cold cache and
 * several hundred milliseconds when warm. Inside an npm script the bin is already on PATH, so the
 * bare name is both the fastest form and the one that fails loudly when the dependency is missing
 * rather than silently fetching something that looks like it.
 */
export const GATE_SCRIPTS = {
  "arch:scan": "harness-arch-scan",
  "dupe:scan": "harness-dupe-scan",
  "dead:scan": "harness-dead-scan",
  "spec:gap": "harness-spec-gap-scan",
  "clone:scan": "harness-clone-scan",
  "incident:scan": "harness-incident-scan",
  "shape:scan": "harness-shape-scan",
  "sanitation": "harness-sanitation",
};

/**
 * The commands biome contributes, in ONE place.
 *
 * `scriptsFor` (the bootstrap path) and the projen Biome component both need these, and two copies of
 * `biome check .` is precisely the drift class this repository has a gate for. The gate would be right.
 */
export const BIOME_SCRIPTS = {
  lint: "biome check .",
  "lint:fix": "biome check --write .",
  format: "biome format --write .",
};

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
    ...BIOME_SCRIPTS,
    verify: checks.join(" && "),
    prepare: "husky",
    ...GATE_SCRIPTS,
  };
}

#!/usr/bin/env node
// The one-shot — drop the whole engineering process into a repository in a single command.
//
//   harness-bootstrap              # write what's missing, never clobber
//   harness-bootstrap --dry-run    # show the plan, touch nothing
//   harness-bootstrap --force      # overwrite existing files (destructive; asks for it explicitly)
//
// WHY THIS EXISTS: installing the plugins gives you the drills and the gates, and then leaves you to
// hand-roll the plumbing that makes them run — pipeline, commit linting, releases, formatter, hooks,
// gate wiring. Standing that up the first time cost three red CI runs (a missing lockfile, a test
// script that never executed the suite, a linter warning that fails the job). Every one of those is
// a SETUP defect, not a project defect, so every adopter would rediscover all three. This ships the
// version that is already proven green.
//
// TWO RULES THIS FOLLOWS:
//   1. Never clobber. An existing file is a decision someone made; it is reported as skipped.
//   2. Say what it imposes. These are opinions (Conventional Commits, semantic-release, ratcheting
//      gates), not laws — the summary names them so you can disagree deliberately rather than
//      discover it three weeks later.
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { detect, plan, render } from "./phases.mjs";
import { mergeGitignore, mergePackageJson } from "./merge.mjs";

const ROOT = process.cwd();
const HERE = dirname(fileURLToPath(import.meta.url));
const TPL = join(HERE, "../templates");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const planOnly = args.includes("--plan");
const auto = args.includes("--auto");
const ship = args.includes("--ship");

// `--plan` answers "where am I and what's next?" by looking at the repo rather than asking. Safe to
// run at any point in the adoption, including before anything has been written.
if (planOnly) {
  console.log(render(plan(detect(ROOT))));
  process.exit(0);
}

const wrote = [];
const skipped = [];

function put(destRel, contents, { exec = false } = {}) {
  const dest = join(ROOT, destRel);
  if (existsSync(dest) && !force) {
    skipped.push(destRel);
    return;
  }
  wrote.push(destRel);
  if (dryRun) return;
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, contents);
  if (exec) chmodSync(dest, 0o755);
}

const tpl = (p) => readFileSync(join(TPL, p), "utf8");

// ── config files ───────────────────────────────────────────────────────────────
put("biome.json", tpl("node/biome.json"));
put("commitlint.config.js", tpl("node/commitlint.config.js"));
put(".releaserc.json", tpl("node/releaserc.json"));
put("knip.json", tpl("node/knip.json"));
put(".jscpd.json", tpl("node/jscpd.json"));
put(".npmrc", tpl("node/npmrc"));
put(".nvmrc", tpl("node/nvmrc"));

// ── the capability descriptor ──────────────────────────────────────────────────
put("harness.json", tpl("common/harness.json"));

// ── .gitignore ─────────────────────────────────────────────────────────────────
const gi = mergeGitignore(ROOT, tpl("common/gitignore"), { dryRun });
if (gi.wrote) wrote.push(gi.wrote);
if (gi.skipped) skipped.push(gi.skipped);

// ── git hooks (husky) ──────────────────────────────────────────────────────────
for (const hook of ["pre-commit", "commit-msg", "pre-push"]) {
  put(`.husky/${hook}`, tpl(`husky/${hook}`), { exec: true });
}

// ── CI + PR ────────────────────────────────────────────────────────────────────
put(".github/workflows/pipeline.yml", tpl("github/workflows/harness.yml"));
put(".github/pull_request_template.md", tpl("github/pull_request_template.md"));

// ── gate wiring: the gates run inside the test suite, not as extra CI steps ─────
const descriptor = (() => {
  try {
    return JSON.parse(readFileSync(join(ROOT, "harness.json"), "utf8"));
  } catch {
    return {};
  }
})();
// WHICH gate spec, and under WHICH filename, is decided by the repo's own test runner. Getting this
// wrong is the worst failure this bootstrap can have: a gate file the runner never discovers reports
// nothing, the suite stays green, and the repo believes it is guarded when it is not. A gate that
// cannot be seen is worse than no gate, because it buys false confidence.
//
// `node --test` provides `test()` from node:test but NOT `expect`, and typically globs a specific
// filename pattern (*.test.mjs). Vitest/Rstest/Jest provide describe/it/expect and glob *.spec.ts.
const testScript = (() => {
  try {
    return JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts?.test ?? "";
  } catch {
    return "";
  }
})();
const usesNodeTest = /\bnode\s+--test\b/.test(testScript);
const gateSpec = usesNodeTest
  ? { template: "specs/gates.test.mjs", name: "gates.test.mjs" }
  : { template: "specs/gates.spec.ts", name: "gates.spec.ts" };
put(`${descriptor.testDir ?? "tests"}/arch/${gateSpec.name}`, tpl(gateSpec.template));

// ── the lessons ledger ─────────────────────────────────────────────────────────
put("docs/LESSONS.md", tpl("common/docs/LESSONS.md"));

// ── the persona status line ────────────────────────────────────────────────────
// Written into the PROJECT's .claude/ rather than shipped as a plugin file: a plugin's own
// settings.json accepts only `agent` and `subagentStatusLine`, never the main `statusLine`.
// It renders in its own row above the built-in model/difficulty badges.
put(".claude/harness-statusline.mjs", tpl("claude/harness-statusline.mjs"), { exec: true });

// Merge the statusLine into .claude/settings.json without trampling existing hooks or keys.
const settingsPath = join(ROOT, ".claude/settings.json");
const settings = (() => {
  try {
    return JSON.parse(readFileSync(settingsPath, "utf8"));
  } catch {
    return {};
  }
})();
if (settings.statusLine === undefined || force) {
  settings.statusLine = { type: "command", command: "node .claude/harness-statusline.mjs" };
  if (!dryRun) {
    mkdirSync(dirname(settingsPath), { recursive: true });
    writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
  }
  wrote.push(".claude/settings.json → statusLine");
} else {
  skipped.push(".claude/settings.json → statusLine (already set)");
}

// ── package.json: merged, never replaced ───────────────────────────────────────
// These two tables are the harness's OPINIONS and belong here; merge.mjs owns only the mechanism of
// folding them in without trampling what the repo already decided.
const SCRIPTS = {
  typecheck: "tsc -p tsconfig.json --noEmit",
  lint: "biome check .",
  "lint:fix": "biome check --write .",
  format: "biome format --write .",
  verify: "npm run typecheck && npm run lint && npm test",
  prepare: "husky",
  "arch:scan": "harness-arch-scan",
  "dupe:scan": "harness-dupe-scan",
  "dead:scan": "harness-dead-scan",
  "spec:gap": "harness-spec-gap-scan",
  "clone:scan": "harness-clone-scan",
  "incident:scan": "harness-incident-scan",
};

const DEV_DEPS = {
  "@biomejs/biome": "^2.5.6",
  "@commitlint/cli": "^20.1.0",
  "@commitlint/config-conventional": "^20.0.0",
  husky: "^9.1.7",
  knip: "^6.0.0",
  "semantic-release": "^25.0.0",
};

const pkgChanges = mergePackageJson(ROOT, { scripts: SCRIPTS, devDependencies: DEV_DEPS }, { dryRun });
const pkgPath = join(ROOT, "package.json");

// ── report ─────────────────────────────────────────────────────────────────────
const label = dryRun ? "would write" : "wrote";
console.log(`\n⚙  Harness bootstrap${dryRun ? " — DRY RUN, nothing was written" : ""}\n`);

if (wrote.length) {
  console.log(`  ${label}:`);
  for (const f of wrote) console.log(`      + ${f}`);
} else {
  console.log("  nothing to write — every file already exists");
}

if (skipped.length) {
  console.log(`\n  skipped (already present — yours wins):`);
  for (const f of skipped) console.log(`      · ${f}`);
}

if (pkgChanges.missing) {
  console.log("\n  ⚠ no package.json found — scripts and devDependencies were not merged");
} else if (pkgChanges.scripts.length || pkgChanges.devDependencies.length) {
  console.log(`\n  package.json (merged, existing keys untouched):`);
  if (pkgChanges.scripts.length) console.log(`      scripts:          ${pkgChanges.scripts.join(", ")}`);
  if (pkgChanges.devDependencies.length)
    console.log(`      devDependencies:  ${pkgChanges.devDependencies.join(", ")}`);
}

console.log(`
  Test runner detected: ${usesNodeTest ? "node --test  → wrote gates.test.mjs" : "describe/it/expect  → wrote gates.spec.ts"}
`);

console.log(`
  What this imposes — these are opinions, not laws. Disagree deliberately:

    · Conventional Commits, enforced by commitlint on every commit and in CI
    · semantic-release owns the version number; never hand-edit one. It only TAGS and writes
      release notes — it never pushes a bump commit back to main, so it works unchanged under a
      ruleset that requires pull requests. (To commit a CHANGELOG.md you need BOTH
      @semantic-release/git and a ruleset bypass actor for Actions; one without the other kills
      the release job with GH013.)
    · Biome for lint + format, with a pre-commit hook that formats staged files
    · pre-push runs the FULL local gate — CI is confirmation, not the first line of defense
    · Quality gates run INSIDE the test suite (${descriptor.testDir ?? "tests"}/arch/${gateSpec.name}),
      so they cost no extra CI minutes and cannot be skipped on their own
    · Gates ratchet: they freeze today's debt and only ever lower the budget. A red gate is fixed
      at the finding, never by raising the number

`);

// The sequence, not a checklist: each step knows why it sits where it does, and the renderer points
// at the single next action rather than handing over a wall of tasks.
if (auto) {
  // --auto continues straight into the mechanical remainder of the sequence rather than handing
  // back a checklist. Everything it does is local and reversible; pushing stays opt-in.
  const { autoAdopt } = await import("./auto.mjs");
  autoAdopt(ROOT, { ship });
} else {
  console.log(render(plan(detect(ROOT))));
  console.log("  Re-run `harness-bootstrap --plan` to see where you are, or --auto to run the rest.\n");
}

if (!dryRun && wrote.length) {
  console.log("  Review every file before committing — especially .github/workflows/, which changes");
  console.log("  what runs with your repository's credentials.\n");
}

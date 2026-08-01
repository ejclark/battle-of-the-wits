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

const ROOT = process.cwd();
const HERE = dirname(fileURLToPath(import.meta.url));
const TPL = join(HERE, "../templates");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const planOnly = args.includes("--plan");

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
put(`${descriptor.testDir ?? "tests"}/arch/gates.spec.ts`, tpl("specs/gates.spec.ts"));

// ── the lessons ledger ─────────────────────────────────────────────────────────
put("docs/LESSONS.md", tpl("common/docs/LESSONS.md"));

// ── package.json: MERGE, never replace ─────────────────────────────────────────
// A repo's package.json is its own; this adds the scripts and dev dependencies the process needs and
// leaves everything else untouched. Existing keys always win — a project that already defines `lint`
// has made a choice.
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
  "@semantic-release/changelog": "^6.0.3",
  "@semantic-release/git": "^10.0.1",
  husky: "^9.1.7",
  knip: "^6.0.0",
  "semantic-release": "^25.0.0",
};

const pkgPath = join(ROOT, "package.json");
const pkgChanges = { scripts: [], devDependencies: [] };

if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.scripts ??= {};
  pkg.devDependencies ??= {};

  for (const [k, v] of Object.entries(SCRIPTS)) {
    if (pkg.scripts[k] === undefined) {
      pkg.scripts[k] = v;
      pkgChanges.scripts.push(k);
    }
  }
  for (const [k, v] of Object.entries(DEV_DEPS)) {
    if (pkg.devDependencies[k] === undefined && pkg.dependencies?.[k] === undefined) {
      pkg.devDependencies[k] = v;
      pkgChanges.devDependencies.push(k);
    }
  }

  if (!dryRun && (pkgChanges.scripts.length || pkgChanges.devDependencies.length)) {
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
}

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

if (!existsSync(pkgPath)) {
  console.log("\n  ⚠ no package.json found — scripts and devDependencies were not merged");
} else if (pkgChanges.scripts.length || pkgChanges.devDependencies.length) {
  console.log(`\n  package.json (merged, existing keys untouched):`);
  if (pkgChanges.scripts.length) console.log(`      scripts:          ${pkgChanges.scripts.join(", ")}`);
  if (pkgChanges.devDependencies.length)
    console.log(`      devDependencies:  ${pkgChanges.devDependencies.join(", ")}`);
}

console.log(`
  What this imposes — these are opinions, not laws. Disagree deliberately:

    · Conventional Commits, enforced by commitlint on every commit and in CI
    · semantic-release owns the version number; never hand-edit one
    · Biome for lint + format, with a pre-commit hook that formats staged files
    · pre-push runs the FULL local gate — CI is confirmation, not the first line of defense
    · Quality gates run INSIDE the test suite (tests/arch/gates.spec.ts), so they cost no extra
      CI minutes and cannot be skipped on their own
    · Gates ratchet: they freeze today's debt and only ever lower the budget. A red gate is fixed
      at the finding, never by raising the number

`);

// The sequence, not a checklist: each step knows why it sits where it does, and the renderer points
// at the single next action rather than handing over a wall of tasks.
console.log(render(plan(detect(ROOT))));
console.log("  Re-run `harness-bootstrap --plan` at any time to see where you are.\n");

if (!dryRun && wrote.length) {
  console.log("  Review every file before committing — especially .github/workflows/, which changes");
  console.log("  what runs with your repository's credentials.\n");
}

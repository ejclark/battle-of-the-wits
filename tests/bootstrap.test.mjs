// The one-shot has to survive contact with a real repository.
//
// A bootstrap is trusted precisely once — the first time someone runs it in a repo they care about.
// If it clobbers a config, mangles a package.json, or writes a half-set of files, that trust is gone
// and the harness goes with it. These cases pin the two promises the drill makes: it never destroys
// existing work, and running it twice is the same as running it once.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BIN = join(dirname(fileURLToPath(import.meta.url)), "../plugins/harness-core/bin/harness-bootstrap");

function run(cwd, args = []) {
  return execFileSync(BIN, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function makeRepo(files = { "package.json": '{"name":"probe","version":"0.0.0"}\n' }) {
  const root = mkdtempSync(join(tmpdir(), "botw-boot-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const EXPECTED = [
  "biome.json",
  "commitlint.config.js",
  ".releaserc.json",
  "knip.json",
  ".jscpd.json",
  ".npmrc",
  ".nvmrc",
  "harness.json",
  ".husky/pre-commit",
  ".husky/commit-msg",
  ".husky/pre-push",
  ".github/workflows/pipeline.yml",
  ".github/pull_request_template.md",
  "tests/arch/gates.spec.ts",
  "docs/LESSONS.md",
];

test("--dry-run writes absolutely nothing", () => {
  const root = makeRepo();
  try {
    const out = run(root, ["--dry-run"]);
    assert.match(out, /DRY RUN/);
    for (const f of EXPECTED) {
      assert.equal(existsSync(join(root, f)), false, `${f} must not exist after a dry run`);
    }
    // The plan still has to be honest about what it would do.
    assert.match(out, /biome\.json/);
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    assert.equal(pkg.scripts, undefined, "package.json must be untouched by a dry run");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a real run lands the whole process", () => {
  const root = makeRepo();
  try {
    run(root);
    for (const f of EXPECTED) {
      assert.equal(existsSync(join(root, f)), true, `${f} should have been written`);
    }
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    assert.equal(pkg.scripts.verify, "npm run typecheck && npm run lint && npm test");
    assert.equal(pkg.scripts["arch:scan"], "harness-arch-scan");
    assert.ok(pkg.devDependencies["@biomejs/biome"], "biome must be added as a dev dependency");
    assert.equal(pkg.name, "probe", "existing package.json fields must survive");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("it never clobbers a file the repo already has", () => {
  const mine = '{"linter":{"enabled":false}}\n';
  const root = makeRepo({
    "package.json": '{"name":"probe","version":"0.0.0","scripts":{"lint":"my-own-linter"}}\n',
    "biome.json": mine,
  });
  try {
    const out = run(root);
    assert.equal(readFileSync(join(root, "biome.json"), "utf8"), mine, "existing config must survive");
    assert.match(out, /skipped/);
    assert.match(out, /biome\.json/);

    // An existing script is a decision; the merge must not overwrite it.
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    assert.equal(pkg.scripts.lint, "my-own-linter", "an existing script must win over the template");
    assert.ok(pkg.scripts.typecheck, "scripts the repo lacks are still added");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--force overwrites, but only when asked", () => {
  const root = makeRepo({
    "package.json": '{"name":"probe","version":"0.0.0"}\n',
    "biome.json": '{"linter":{"enabled":false}}\n',
  });
  try {
    run(root, ["--force"]);
    assert.match(readFileSync(join(root, "biome.json"), "utf8"), /biomejs\.dev/, "should be the template now");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("running it twice is the same as running it once", () => {
  const root = makeRepo();
  try {
    run(root);
    const first = EXPECTED.map((f) => readFileSync(join(root, f), "utf8"));
    const pkgFirst = readFileSync(join(root, "package.json"), "utf8");

    const out = run(root);
    assert.match(out, /nothing to write|skipped/);

    EXPECTED.forEach((f, i) => {
      assert.equal(readFileSync(join(root, f), "utf8"), first[i], `${f} changed on a second run`);
    });
    assert.equal(readFileSync(join(root, "package.json"), "utf8"), pkgFirst, "package.json drifted");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("it degrades honestly when there is no package.json", () => {
  const root = mkdtempSync(join(tmpdir(), "botw-boot-"));
  try {
    const out = run(root);
    assert.match(out, /no package\.json/, "must say so rather than silently skipping the merge");
    assert.equal(existsSync(join(root, "biome.json")), true, "file templates still land");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the gate spec it writes invokes the harness binaries, not local script paths", () => {
  const root = makeRepo();
  try {
    run(root);
    const spec = readFileSync(join(root, "tests/arch/gates.spec.ts"), "utf8");
    assert.match(spec, /harness-arch-scan/);
    assert.doesNotMatch(spec, /scripts\/arch-scan\.mjs/, "must not reference the origin repo's layout");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("gate wiring follows the descriptor's testDir", () => {
  const root = makeRepo({
    "package.json": '{"name":"probe","version":"0.0.0"}\n',
    "harness.json": '{"sourceDir":"lib","testDir":"spec","specSuffix":".test.ts"}\n',
  });
  try {
    run(root);
    assert.equal(existsSync(join(root, "spec/arch/gates.spec.ts")), true, "should honor testDir: spec");
    assert.equal(existsSync(join(root, "tests/arch/gates.spec.ts")), false, "must not use the default");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--plan works before anything exists and points at the first step", () => {
  const root = makeRepo();
  try {
    const out = run(root, ["--plan"]);
    assert.match(out, /Adoption sequence/);
    assert.match(out, /Next: Write the process files/);
    // Nothing may be written by a plan query.
    assert.equal(existsSync(join(root, "biome.json")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--plan advances as the repo's state changes", () => {
  const root = makeRepo();
  try {
    run(root);
    const afterWrite = run(root, ["--plan"]);
    assert.match(afterWrite, /Next: Install dependencies/, "writing files should advance the plan");
    assert.match(afterWrite, /✓ Write the process files/, "the completed step must be marked done");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the plan states both ordering traps, since skipping them is how adoption fails", () => {
  const root = makeRepo();
  try {
    const out = run(root, ["--plan"]);
    // Freeze-before-CI: a ratcheting gate with no budget reports the whole repo as new debt.
    assert.match(out, /Grandfather today's debt/);
    assert.match(out, /BEFORE the gates run in CI/);
    // Require-after-green: a never-reported required check wedges every PR silently.
    assert.match(out, /after it has passed once/);
    assert.match(out, /waiting for status/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("steps needing repo admin are flagged as the user's call", () => {
  const root = makeRepo();
  try {
    const out = run(root, ["--plan"]);
    assert.match(out, /needs repo admin/, "credentialed steps must be marked, never silently assumed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

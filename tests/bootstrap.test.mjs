// The one-shot has to survive contact with a real repository.
//
// A bootstrap is trusted precisely once — the first time someone runs it in a repo they care about.
// If it clobbers a config, mangles a package.json, or writes a half-set of files, that trust is gone
// and the harness goes with it. These cases pin the two promises the drill makes: it never destroys
// existing work, and running it twice is the same as running it once.
import { test } from "node:test";
import { bin, runLauncher } from "./helpers.mjs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const BIN = bin("harness-core", "harness-bootstrap");

function run(cwd, args = []) {
  return runLauncher(BIN, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
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
  "tests/arch/gates.test.mjs",
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
    // This scratch repo has no tsconfig.json, so verify must NOT invoke tsc. The previous
    // expectation here asserted the defect: a verify that died on TS5058, on the adopter's very
    // first run, for a file they do not have. The tsconfig case is asserted separately below.
    assert.equal(pkg.scripts.verify, "npm run lint && npm test");
    assert.equal(pkg.scripts.typecheck, undefined, "no typecheck script without its config");
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
    assert.ok(pkg.scripts.verify, "scripts the repo lacks are still added");
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
    const spec = readFileSync(join(root, "tests/arch/gates.test.mjs"), "utf8");
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
    // Both halves come from the descriptor: `testDir` decides WHERE, and `specSuffix` decides
    // whether the repo's own test command will ever collect the file.
    assert.equal(existsSync(join(root, "spec/arch/gates.test.ts")), true, "should honor testDir and specSuffix");
    assert.equal(existsSync(join(root, "tests/arch/gates.test.mjs")), false, "must not use the defaults");
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

test("the status line is installed and .claude/settings.json is MERGED, not replaced", () => {
  // The critical property: a repo's settings.json usually already carries hooks. Replacing it would
  // silently disable them, and nothing would report the loss.
  const existing = JSON.stringify(
    { hooks: { UserPromptSubmit: [{ hooks: [{ type: "command", command: "echo mine" }] }] } },
    null,
    2,
  );
  const root = makeRepo({
    "package.json": '{"name":"probe","version":"0.0.0"}\n',
    ".claude/settings.json": `${existing}\n`,
  });
  try {
    run(root);
    const settings = JSON.parse(readFileSync(join(root, ".claude/settings.json"), "utf8"));
    assert.ok(settings.hooks?.UserPromptSubmit, "pre-existing hooks must survive");
    assert.equal(settings.hooks.UserPromptSubmit[0].hooks[0].command, "echo mine");
    assert.equal(settings.statusLine.type, "command", "the status line must still be added");
    assert.equal(existsSync(join(root, ".claude/harness-statusline.mjs")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an existing statusLine is a decision and wins", () => {
  const root = makeRepo({
    "package.json": '{"name":"probe","version":"0.0.0"}\n',
    ".claude/settings.json": '{"statusLine":{"type":"command","command":"my-own-line"}}\n',
  });
  try {
    const out = run(root);
    const settings = JSON.parse(readFileSync(join(root, ".claude/settings.json"), "utf8"));
    assert.equal(settings.statusLine.command, "my-own-line");
    assert.match(out, /already set/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the status line reports the persona and depth, and stays silent when unadopted", () => {
  const { execFileSync: exec } = require("node:child_process");
  const adopted = makeRepo();
  const bare = makeRepo();
  try {
    run(adopted);
    // Assert on content, not on escape sequences — the row is colourised, so raw matching would
    // pin the ANSI codes rather than the meaning.
    const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
    const line = strip(
      exec("node", [join(adopted, ".claude/harness-statusline.mjs")], {
        input: JSON.stringify({ workspace: { current_dir: adopted } }),
        encoding: "utf8",
      }),
    );
    assert.match(line, /dungeon/, "the active persona must be named");
    assert.match(line, /depth 0\/5/, "depth must reflect real state, not an assumption");
    assert.match(line, /The Threshold/, "the current chamber must be named");

    // A repo that never adopted the harness has no descriptor — the row must be empty, not a guess.
    const quiet = exec("node", [join(adopted, ".claude/harness-statusline.mjs")], {
      input: JSON.stringify({ workspace: { current_dir: bare } }),
      encoding: "utf8",
    });
    assert.equal(quiet.trim(), "", "no descriptor means no row");
  } finally {
    rmSync(adopted, { recursive: true, force: true });
    rmSync(bare, { recursive: true, force: true });
  }
});

test("the gate spec matches the repo's test runner — node --test gets node:test", () => {
  // The worst failure this bootstrap can have: a gate file the runner never discovers. It reports
  // nothing, the suite stays green, and the repo believes it is guarded when it is not.
  const root = makeRepo({
    "package.json": '{"name":"probe","scripts":{"test":"node --test \\"tests/**/*.test.mjs\\""}}\n',
  });
  try {
    const out = run(root);
    assert.equal(existsSync(join(root, "tests/arch/gates.test.mjs")), true, "must match the *.test.mjs glob");
    assert.equal(existsSync(join(root, "tests/arch/gates.spec.ts")), false, "the wrong flavor must not appear");
    const spec = readFileSync(join(root, "tests/arch/gates.test.mjs"), "utf8");
    assert.match(spec, /from "node:test"/);
    assert.doesNotMatch(spec, /\bexpect\(/, "node --test provides no expect()");
    assert.match(out, /node --test/, "the chosen flavor must be reported, never silent");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a describe/it/expect runner gets the .spec.ts flavor", () => {
  const root = makeRepo({ "package.json": '{"name":"probe","scripts":{"test":"vitest run"}}\n' });
  try {
    run(root);
    assert.equal(existsSync(join(root, "tests/arch/gates.spec.ts")), true);
    assert.equal(existsSync(join(root, "tests/arch/gates.test.mjs")), false);
    assert.match(readFileSync(join(root, "tests/arch/gates.spec.ts"), "utf8"), /describe\(/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("both gate flavors name every scanner — neither may quietly cover less", () => {
  const scanners = ["arch", "dupe", "dead", "spec-gap", "clone", "incident"];
  for (const [pkg, file] of [
    ['{"name":"p","scripts":{"test":"node --test x"}}', "tests/arch/gates.test.mjs"],
    ['{"name":"p","scripts":{"test":"vitest run"}}', "tests/arch/gates.spec.ts"],
  ]) {
    const root = makeRepo({ "package.json": `${pkg}\n` });
    try {
      run(root);
      const body = readFileSync(join(root, file), "utf8");
      for (const s of scanners) {
        assert.match(body, new RegExp(`harness-${s}-scan`), `${file} omits harness-${s}-scan`);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("a .gitignore is written — without it the automated run commits node_modules", () => {
  // Found by running --auto on a clean repo: `git add -A` staged the entire dependency tree.
  const root = makeRepo();
  try {
    run(root);
    const ignored = readFileSync(join(root, ".gitignore"), "utf8");
    assert.match(ignored, /node_modules/);
    assert.match(ignored, /\.harness/, "runtime claim state must never be committed either");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an existing .gitignore is appended to, never replaced", () => {
  const mine = "dist/\n*.env\n";
  const root = makeRepo({ "package.json": "{}\n", ".gitignore": mine });
  try {
    run(root);
    const after = readFileSync(join(root, ".gitignore"), "utf8");
    assert.match(after, /dist\//, "the repo's own rules must survive");
    assert.match(after, /\*\.env/);
    assert.match(after, /node_modules/, "and the harness's needs are added");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a .gitignore that already covers it is left alone", () => {
  // The fixture is READ FROM THE TEMPLATE rather than transcribed. A hand-written copy is a second
  // source of truth: adding one line to the shipped template broke this case, and the case was
  // asserting on the transcription, not on the behaviour.
  const shipped = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../plugins/harness-core/templates/common/gitignore"),
    "utf8",
  );
  const root = makeRepo({ "package.json": "{}\n", ".gitignore": shipped });
  try {
    const out = run(root);
    assert.match(out, /already covers what the harness needs/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// The two adopted detectors are scoped by config, not by scanner code. Every scanner was made
// descriptor-aware; these two config files were not, so a repo declaring any layout other than
// `src/` got scanners looking in the right place and detectors looking in the wrong one — and an
// empty scope reports a confident zero, which is indistinguishable from a clean repository.
test("the adopted detectors are scoped to the repo's declared layout", () => {
  const root = makeRepo({
    "package.json": '{"name":"probe","version":"0.0.0"}\n',
    "harness.json": '{"sourceDir":"lib","testDir":"spec","sourceExt":".js","specSuffix":".test.js"}\n',
  });
  try {
    run(root);
    const knip = JSON.parse(readFileSync(join(root, "knip.json"), "utf8"));
    const jscpd = JSON.parse(readFileSync(join(root, ".jscpd.json"), "utf8"));
    assert.deepEqual(jscpd.path, ["lib"], "jscpd must scan the declared source dir");
    assert.ok(knip.project.includes("lib/**/*.js"), "knip must walk the declared source dir");
    assert.ok(knip.entry.includes("spec/**/*.test.js"), "knip must treat the declared specs as entries");
    for (const blob of [JSON.stringify(knip), JSON.stringify(jscpd)]) {
      assert.doesNotMatch(blob, /"src\//, "no config may hardcode src/");
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// The pre-commit hook handles a filename containing a space.
//
// It runs on every commit in an adopter's repository, and it word-split its staged-file list: a file
// named "release notes.md" became two arguments, so formatting silently skipped it and `git add` was
// handed two paths that do not exist. A file list that only breaks once somebody has a space in a
// filename is a bug nobody is looking for on the day it appears.
test("the shipped pre-commit hook survives a filename with a space", () => {
  const hook = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../plugins/harness-core/templates/husky/pre-commit"),
    "utf8",
  );
  assert.match(hook, /-z\b/, "paths must be NUL-delimited");
  assert.match(hook, /xargs -0/, "and consumed by something that respects the delimiter");
  assert.doesNotMatch(hook, /\$files\s*$/m, "an unquoted, newline-joined list splits on spaces");

  const root = makeRepo({ "package.json": "{}\n" });
  try {
    const git = (...a) => execFileSync("git", a, { cwd: root, stdio: "pipe", encoding: "utf8" });
    git("init", "-q", "-b", "main");
    git("config", "user.email", "probe@example.com");
    git("config", "user.name", "probe");
    run(root); // lands .husky/pre-commit
    writeFileSync(join(root, "release notes.md"), "# notes\n");
    git("add", "-A");
    // Run the hook exactly as husky would. biome is absent here, so the format step no-ops; the
    // assertion is that the PATH HANDLING survives, which is where the defect lived.
    const out = execFileSync("sh", [join(root, ".husky/pre-commit")], { cwd: root, encoding: "utf8", stdio: "pipe" });
    assert.equal(typeof out, "string");
    assert.match(git("diff", "--cached", "--name-only"), /release notes\.md/, "the file must still be staged");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// The gate file must match the repo's OWN spec glob, not the template's.
//
// A repository whose suite globs `spec/**/*.test.js` was handed `gates.test.mjs` — a file its runner
// would never collect. The gates reported nothing, the suite stayed green, and the repo believed it
// was guarded. The runner decides which globals exist; the SUFFIX decides whether the file is seen at
// all, and those are two different questions that were being answered by one check.
test("the gate file carries the suffix the repo's own test command collects", () => {
  const root = makeRepo({
    "package.json": '{"name":"probe","type":"module","scripts":{"test":"node --test \\"spec/**/*.test.js\\""}}\n',
    "harness.json": '{"testDir":"spec","sourceExt":".js","specSuffix":".test.js"}\n',
  });
  try {
    run(root);
    assert.equal(existsSync(join(root, "spec/arch/gates.test.js")), true, "must match *.test.js");
    assert.equal(existsSync(join(root, "spec/arch/gates.test.mjs")), false, "the default would never be collected");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a CommonJS package gets .mjs, because ESM cannot live in its .js", () => {
  // The one case where the two answers genuinely conflict: `.js` in a CJS package cannot hold the
  // ESM the template is written in. Correctness of the file wins over collectability, because a file
  // that throws on import is at least loud.
  const root = makeRepo({
    "package.json": '{"name":"probe","scripts":{"test":"node --test \\"spec/**/*.test.js\\""}}\n',
    "harness.json": '{"testDir":"spec","specSuffix":".test.js"}\n',
  });
  try {
    run(root);
    assert.equal(existsSync(join(root, "spec/arch/gates.test.mjs")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a repo WITH a tsconfig.json still gets its typecheck — the negative control", () => {
  // Without this, the assertion above passes for the wrong reason: a bootstrap that never wrote a
  // typecheck at all would satisfy it, and would silently weaken every TypeScript adopter.
  const root = makeRepo({
    "package.json": '{"name":"probe","version":"0.0.0"}\n',
    "tsconfig.json": '{"compilerOptions":{"strict":true}}\n',
  });
  try {
    run(root);
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    assert.equal(pkg.scripts.typecheck, "tsc -p tsconfig.json --noEmit");
    assert.match(pkg.scripts.verify, /npm run typecheck/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

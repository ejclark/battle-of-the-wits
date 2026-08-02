// The starter has to be a WORKING project the moment it lands, not a set of files that resemble one.
//
// The specific failure this guards against: a scaffold whose tests do not run, or run and pass
// vacuously. Someone learning is in no position to tell the difference between "8 passing" and
// "8 passing because they assert nothing" — and the first suite they ever see is the one that
// decides whether they believe suites are worth writing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { STARTER_SCRIPTS, initGit, scriptsOf, starterFiles, writeStarter } from "../plugins/harness-core/lib/starter.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

test("the starter's own suite passes from a cold copy, and is not vacuous", () => {
  const dir = mkdtempSync(join(tmpdir(), "starter-"));
  writeStarter(dir, { kind: "todo" });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "s", type: "module" }));

  const bare = { ...process.env };
  delete bare.NODE_TEST_CONTEXT;
  delete bare.NODE_OPTIONS;
  const out = execFileSync(process.execPath, ["--test", "--test-reporter=tap", "tests/todo.test.mjs"], { cwd: dir, encoding: "utf8", env: bare });
  assert.match(out, /# fail 0/);
  assert.match(out, /# pass [1-9]/, "a scaffold whose first suite is empty teaches that suites are decoration");

  // PLANTED VIOLATION: break the logic and require the suite to notice. Without this the test above
  // passes against a file of assertions that check nothing, which is the exact thing a learner
  // cannot detect and would be worst to ship them.
  const src = join(dir, "src/todo.mjs");
  writeFileSync(src, readFileSync(src, "utf8").replace("return trimmed ? [...items,", "return true ? [...items,"));
  assert.throws(
    () => execFileSync(process.execPath, ["--test", "--test-reporter=tap", "tests/todo.test.mjs"], { cwd: dir, encoding: "utf8", env: bare }),
    "the starter's tests do not actually check the behaviour they claim to",
  );
});

test("every requirement is numbered and the tests cover the three named capabilities", () => {
  const reqs = readFileSync(join(REPO, "plugins/harness-core/templates/starter/todo/REQUIREMENTS.md"), "utf8");
  const spec = readFileSync(join(REPO, "plugins/harness-core/templates/starter/todo/tests/todo.test.mjs"), "utf8");

  const numbered = [...reqs.matchAll(/^\*\*R(\d+) · /gm)].map((m) => Number(m[1]));
  assert.ok(numbered.length >= 8, `only ${numbered.length} requirements — the file is meant to be the worked example`);
  assert.deepEqual(numbered, [...numbered].sort((a, b) => a - b), "requirement numbers must be in order");

  // The unwanted-behaviour cases are the point of the exercise: nobody tests them by hand, and they
  // are what a change six months out breaks. A requirements doc listing only happy paths teaches
  // the wrong lesson twice over.
  const unwanted = [...reqs.matchAll(/Unwanted behaviour/g)].length;
  assert.ok(unwanted >= 3, `only ${unwanted} unwanted-behaviour requirements — those are the ones worth writing down`);

  for (const capability of ["create", "delete", "edit"]) {
    assert.match(spec, new RegExp(`a user can ${capability} a to-do item`), `no test names the "${capability}" capability`);
  }
});

test("the starter needs no build step and says so", () => {
  // The trade-off is deliberate and stated rather than hidden: installing 200 packages to render a
  // list is how a first project stops being fun on day one. If a bundler ever arrives here, it
  // should arrive as a decision somebody argued for, not by accretion.
  const lib = readFileSync(join(REPO, "plugins/harness-core/lib/starter.mjs"), "utf8");
  assert.match(lib, /No bundler config, no framework, no build step/);
  assert.ok(!starterFiles().some((f) => /webpack|rspack|vite|rollup|babel/.test(f)), "a build config appeared in the starter");
  assert.match(STARTER_SCRIPTS.dev, /serve/);

  // The logic file must stay free of the DOM. That separation is why the tests need no browser, and
  // it is the single most useful habit the starter is trying to transmit.
  const logic = readFileSync(join(REPO, "plugins/harness-core/templates/starter/todo/src/todo.mjs"), "utf8");
  for (const dom of [/document\./, /window\./, /localStorage/]) {
    assert.ok(!dom.test(logic), `todo.mjs touches the DOM (${dom}) — that is what makes its tests need setup`);
  }
});

// ── the lower rung ─────────────────────────────────────────────────────────────

test("hello is the default, and it is genuinely smaller than todo", () => {
  // The order is the design. Somebody who has watched their own five words become a picture opens
  // the to-do app looking for what to change; somebody handed the to-do app first is reading a
  // codebase. If hello ever stops being the smaller, default rung, the ladder has inverted.
  const hello = mkdtempSync(join(tmpdir(), "hello-"));
  const todo = mkdtempSync(join(tmpdir(), "todo-"));
  const h = writeStarter(hello, {});
  const t = writeStarter(todo, { kind: "todo" });
  assert.ok(h.wrote.includes("index.html"), "hello must be what you get with no arguments");
  assert.ok(h.wrote.length <= t.wrote.length, "the first rung cannot be the bigger one");
  assert.ok(h.wrote.includes("STUCK.md"), "the blank-page answer ships with the lower rung, not the higher one");
});

test("the picture is a rule, not a novelty — same words in, same picture out", () => {
  // A generated image looks like magic and magic is untestable. These assert it is not magic, which
  // is the entire pedagogical point: they can work out WHY by reading fifteen lines.
  const dir = mkdtempSync(join(tmpdir(), "hello-"));
  writeStarter(dir, {});
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "h", type: "module" }));
  const bare = { ...process.env };
  delete bare.NODE_TEST_CONTEXT;
  delete bare.NODE_OPTIONS;
  const out = execFileSync(process.execPath, ["--test", "--test-reporter=tap", "tests/scene.test.mjs"], { cwd: dir, encoding: "utf8", env: bare });
  assert.match(out, /# fail 0/);
  assert.match(out, /# pass [1-9]/);

  // The rules file must stay DOM-free, same as todo.mjs — it is why "does seven mean seven" is
  // checkable without a browser, and it is the habit both rungs exist to transmit.
  const rules = readFileSync(join(dir, "scene.mjs"), "utf8");
  for (const dom of [/document\./, /window\./, /canvas/i]) {
    assert.ok(!dom.test(rules), `scene.mjs touches the browser (${dom}) — that is what makes its tests need setup`);
  }
});

test("the stuck path hands over material rather than suggestions", () => {
  // /spark's rule, made concrete: revealing a gap beats handing over an idea. Five questions produce
  // raw material in thirty seconds, and material is much easier to argue with than a blank page.
  const stuck = readFileSync(join(REPO, "plugins/harness-core/templates/starter/hello/STUCK.md"), "utf8");
  assert.ok([...stuck.matchAll(/^\d\. \*\*/gm)].length >= 5, "fewer than five questions — the word list needs five");
  assert.match(stuck, /answers are the input|answers ARE the input/i, "it has to say the answers are used, or it reads as a warm-up");
  assert.match(stuck, /WORDS = \[/, "it must show exactly where the answers go");
});

test("--git leaves the starter undoable, and never touches existing history", () => {
  // The promise the starter makes is that this is somewhere safe to experiment, and an app you
  // cannot undo a change to is not that. It is also what turns `harness-new --push` from an error
  // into a next step — the gap that made publishing a starter a manual git lesson.
  const dest = mkdtempSync(join(tmpdir(), "starter-git-"));
  writeStarter(dest, {});
  assert.equal(initGit(dest).initialised, true);
  assert.ok(existsSync(join(dest, ".git")), "harness-new --push needs a repository to push");
  const files = execFileSync("git", ["-C", dest, "show", "--name-only", "--format=", "HEAD"], { encoding: "utf8" });
  assert.match(files, /index\.html/, "the first commit must contain the starter, not be empty");

  // Somebody running the starter inside existing work is not asking for their history to be touched.
  const again = initGit(dest);
  assert.equal(again.initialised, false);
  assert.match(again.reason, /already a git repository/);

  // And the identity is per-commit, not written into the new repo — the person's own name must land
  // on everything they do next rather than a placeholder they silently inherit.
  const config = execFileSync("git", ["-C", dest, "config", "--local", "--list"], { encoding: "utf8" });
  assert.doesNotMatch(config, /starter@localhost/, "the placeholder identity must not persist into the repo");
});


test("the documented test command actually runs the starter's suite, in a cold copy", () => {
  // ASSERT THE PROPERTY, NOT ONE RENDERING OF IT. This case replaces `assert.match(
  // STARTER_SCRIPTS.test, /node --test/)`, which stayed green for the whole time the command was
  // BROKEN: `node --test tests/` matches that regex and fails on Node 22 with `Cannot find module
  // .../tests`, because node reads a bare directory as a script to run rather than a tree to search.
  // A beginner's very first `npm test` returned an error about a file they never wrote, at exactly
  // the moment the starter promises "a green suite before you have written anything".
  //
  // So this runs the string. A command nobody executes is documentation, and documentation is where
  // this defect lived.
  const dest = mkdtempSync(join(tmpdir(), "starter-cmd-"));
  writeStarter(dest, {});
  // Run the string THROUGH A SHELL, which is what `npm test` does with it. Splitting it on spaces
  // and handing the pieces to execFileSync would test a command nobody runs — the quoting around
  // the glob is part of what makes it work.
  const out = execSync(`${STARTER_SCRIPTS.test} --test-reporter=tap`, {
    cwd: dest,
    encoding: "utf8",
    // NODE_TEST_CONTEXT must go, or the nested runner emits a serialized stream for its parent
    // instead of TAP and this reads as empty output. The cold-copy case above strips it for the
    // same reason — the second place that needed it, which is how a lesson becomes a habit.
    env: { ...process.env, NODE_TEST_CONTEXT: undefined, NODE_OPTIONS: undefined },
  });
  assert.match(out, /# fail 0/, `the command handed to every new project must pass:\n${out}`);
  assert.doesNotMatch(out, /# pass 0/, "…and it must actually have found the tests, not passed vacuously");
});


test("every rung ships a package.json, so nobody is asked to hand-assemble JSON", () => {
  // THE DEFECT THIS CLOSES, stated plainly because it is the whole reason the rung system changed:
  // the starter used to PRINT the scripts and leave the file uncreated, so a beginner's first
  // command failed with ENOENT on a file they had never heard of. "Copy this fragment into a file
  // that does not exist yet" is not an instruction somebody who has never written code can follow.
  for (const kind of ["hello", "todo", "react"]) {
    const dest = mkdtempSync(join(tmpdir(), `rung-${kind}-`));
    writeStarter(dest, { kind });
    const pkgPath = join(dest, "package.json");
    assert.ok(existsSync(pkgPath), `${kind} must ship a package.json — printing one does not count`);
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    assert.ok(pkg.scripts?.dev, `${kind} needs a dev script`);
    assert.ok(pkg.scripts?.test, `${kind} needs a test script`);
    assert.deepEqual(pkg.scripts, scriptsOf(kind), "the scripts must be read from the rung, not kept beside it");
  }
});

test("the React rung is opt-in, and the frameworkless rungs stay free of it", () => {
  // The no-bundler rule was never "bundlers are bad" — it is that one has to earn its place. That
  // bargain only holds if the default rung stays clean: a beginner who wanted one page must not
  // inherit a build step, an install, or 200 packages.
  for (const kind of ["hello", "todo"]) {
    const dest = mkdtempSync(join(tmpdir(), `bare-${kind}-`));
    writeStarter(dest, { kind });
    const pkg = JSON.parse(readFileSync(join(dest, "package.json"), "utf8"));
    assert.equal(pkg.dependencies, undefined, `${kind} must need no install to run`);
    assert.equal(pkg.devDependencies, undefined, `${kind} must need no build to run`);
    assert.ok(!starterFiles(join(REPO, `plugins/harness-core/templates/starter/${kind}`)).some((f) => /rspack|vite|webpack/.test(f)), `a build config appeared in ${kind}`);
  }
});

test("the React rung builds with rspack, the toolchain this project actually uses", () => {
  // A starter that taught a different bundler from the harness around it would be teaching a fork —
  // and the person it teaches is the one least able to tell the two apart.
  const dest = mkdtempSync(join(tmpdir(), "react-rung-"));
  writeStarter(dest, { kind: "react" });
  const pkg = JSON.parse(readFileSync(join(dest, "package.json"), "utf8"));
  assert.ok(pkg.dependencies.react, "the React rung must actually depend on React");
  assert.ok(Object.keys(pkg.devDependencies).some((d) => d.startsWith("@rspack/")), "it must build with rspack");
  for (const foreign of ["vite", "webpack", "parcel", "esbuild"]) {
    assert.ok(!Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).some((d) => d.includes(foreign)), `${foreign} is not this project's toolchain`);
  }
  assert.ok(existsSync(join(dest, "rspack.config.mjs")));
  // Fast Refresh emits $RefreshSig$ calls that only resolve with a plugin this rung does not carry,
  // and without it the page renders BLANK with one console error — the worst possible first five
  // minutes. Verified by hitting it: the config must not ask for what the deps cannot provide.
  // Comments stripped first: the config EXPLAINS why refresh is off, and a naive scan of the file
  // matches that explanation and fails on the very prose that documents the fix. Assert the code.
  const config = readFileSync(join(dest, "rspack.config.mjs"), "utf8").replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(config, /refresh:\s*true/, "refresh needs @rspack/plugin-react-refresh, which this rung does not install");
});

test("every rung's suite passes from a cold copy, by running the command the rung ships", () => {
  // Runs the string rather than matching it. The assertion this replaces matched /node --test/ and
  // stayed green for the whole time the command was broken.
  for (const kind of ["hello", "todo", "react"]) {
    const dest = mkdtempSync(join(tmpdir(), `cold-${kind}-`));
    writeStarter(dest, { kind });
    const out = execSync(`${scriptsOf(kind).test} --test-reporter=tap`, {
      cwd: dest,
      encoding: "utf8",
      env: { ...process.env, NODE_TEST_CONTEXT: undefined, NODE_OPTIONS: undefined },
    });
    assert.match(out, /# fail 0/, `${kind}'s own suite must pass before anything is written:\n${out}`);
    assert.doesNotMatch(out, /# pass 0/, `${kind}'s suite must actually have found its tests`);
  }
});

test("the React rung's logic has no React in it, which is why its tests need no browser", () => {
  // The single most useful habit the starter transmits, and the reason `npm test` is instant: the
  // rules live apart from the drawing. A component is a picture of the page; a decision is not.
  const logic = readFileSync(join(REPO, "plugins/harness-core/templates/starter/react/src/greeting.js"), "utf8");
  for (const forbidden of [/from "react"/, /useState/, /document\./, /jsx/i]) {
    assert.ok(!forbidden.test(logic), `greeting.js references ${forbidden} — that is what would make its tests need setup`);
  }
});

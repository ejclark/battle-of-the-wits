// The starter has to be a WORKING project the moment it lands, not a set of files that resemble one.
//
// The specific failure this guards against: a scaffold whose tests do not run, or run and pass
// vacuously. Someone learning is in no position to tell the difference between "8 passing" and
// "8 passing because they assert nothing" — and the first suite they ever see is the one that
// decides whether they believe suites are worth writing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { STARTER_SCRIPTS, starterFiles, writeStarter } from "../plugins/harness-core/lib/starter.mjs";

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
  assert.match(STARTER_SCRIPTS.test, /node --test/);

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

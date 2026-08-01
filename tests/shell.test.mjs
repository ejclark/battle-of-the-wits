import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

// Shellcheck, in the suite rather than only in CI.
//
// A backtick-quoted skill name inside a double-quoted shell string reads as command substitution.
// `npm test` was green; CI caught it; the round trip cost a push, a runner, and a red PR — for a
// check that was already installed on this machine and takes 200ms.
//
// The rule this enforces on the harness itself: every check CI runs should be runnable locally by
// the project's own command. A verification step that only exists in CI turns a typo into a
// commit-push-wait cycle, and the wait is where people stop verifying.
const PLUGINS = join(dirname(fileURLToPath(import.meta.url)), "../plugins");

const filesIn = (dir) => {
  try {
    return readdirSync(dir).map((f) => join(dir, f));
  } catch {
    return []; // a plugin need not ship launchers, or hooks
  }
};

/**
 * Every shell script this harness SHIPS — launchers and the git-hook templates alike.
 *
 * CI shellchecks `plugins/*<!---->/bin/*`, which is every launcher and no hook. The hooks run on
 * every commit and every push in an adopter's repository, and they had never been checked by
 * anything: `pre-commit` word-split its staged-file list, so a filename containing a space silently
 * skipped formatting and then handed `git add` two paths that do not exist. A glob is an
 * enumeration, and an enumeration only ever covers what its author thought of.
 */
const shipped = () => [
  ...readdirSync(PLUGINS, { withFileTypes: true })
    .filter((p) => p.isDirectory())
    .flatMap((p) => filesIn(join(PLUGINS, p.name, "bin"))),
  ...filesIn(join(PLUGINS, "harness-core/templates/husky")),
];

const available = () => {
  try {
    execFileSync("shellcheck", ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
};

test("every shipped shell script passes shellcheck", () => {
  const files = shipped();
  assert.ok(files.length > 0, "no scripts found — the glob is wrong, not the repo");
  assert.ok(
    files.some((f) => f.includes("/husky/")),
    "the git hooks must be in scope — they run on every commit in an adopter's repo",
  );
  if (!available()) {
    // Says so rather than passing silently. CI installs shellcheck, so the dimension is always
    // measured somewhere — a local skip is a convenience, never a verdict.
    console.error("shellcheck not installed locally — skipped here; CI still enforces it.");
    return;
  }
  try {
    execFileSync("shellcheck", files, { stdio: "pipe" });
  } catch (err) {
    assert.fail(`shellcheck reported problems:\n\n${err.stdout ?? ""}${err.stderr ?? ""}`);
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// The harness gating itself — dogfooding as the first eval. If it cannot hold its own repository to
// the standard it sells, it has no business holding anyone else's.
//
// This differs from the shipped template in exactly one way, deliberately: an adopter gets the
// scanners on PATH from the installed plugin, whereas here they live in the working tree. So the bin
// directory is resolved locally rather than assumed.
const BIN = join(dirname(fileURLToPath(import.meta.url)), "../../plugins/harness-gates/bin");

const gate = (name) => {
  try {
    execFileSync(join(BIN, name), { cwd: join(BIN, "../../.."), stdio: "pipe" });
  } catch (err) {
    assert.fail(`${name} reported debt over budget:\n\n${err.stdout ?? ""}${err.stderr ?? ""}`);
  }
};

// Budgets are frozen at today's numbers and only ratchet DOWN. A red gate here means NEW debt —
// fix the finding, never the budget.
//
// ALL SIX, deliberately. This file ran three for a while, because the other three each had a soft
// prerequisite (knip uninstalled, no ledger, no frozen budget) and each degraded politely to a skip.
// The result was a repository selling six dimensions of measurement while looking at three — and an
// unmeasured dimension is not a passing grade, it is a blind spot. Any gate the shipped template
// wires into an adopter's suite runs here too, or the harness is not dogfooding, it is claiming.
test("no source file exceeds its committed line budget", () => gate("harness-arch-scan"));
test("duplication has not grown past its budget", () => gate("harness-dupe-scan"));
test("copy-pasted blocks have not grown past their budget", () => gate("harness-clone-scan"));
test("dead code has not grown past its budget", () => gate("harness-dead-scan"));
test("the spec gap has not grown past its budget", () => gate("harness-spec-gap-scan"));
test("every incident has a banked lesson", () => gate("harness-incident-scan"));

// A budget file carries two kinds of entry: numbers, and the prose explaining a deliberate raise.
// `--update` rewrites the file wholesale, and it used to keep only the numbers — so the one thing a
// future maintainer needs in order to judge whether a raise is still earned was destroyed by the
// routine act of ratcheting. Silent loss of reasoning is the worst shape of drift: nothing fails.
test("--update preserves the recorded justification for a raise", () => {
  const root = mkdtempSync(join(tmpdir(), "botw-budget-"));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src/a.ts"), "export const a = 1;\n");
  writeFileSync(
    join(root, "arch-budget.json"),
    JSON.stringify({ _why_a: "raised on purpose, see PR #1", "src/a.ts": 99 }, null, 2),
  );
  execFileSync(join(BIN, "harness-arch-scan"), ["--update"], { cwd: root, stdio: "pipe" });
  const after = JSON.parse(readFileSync(join(root, "arch-budget.json"), "utf8"));
  assert.equal(after._why_a, "raised on purpose, see PR #1");
  assert.equal(after["src/a.ts"], 2, "the numeric budget should still ratchet down");
});

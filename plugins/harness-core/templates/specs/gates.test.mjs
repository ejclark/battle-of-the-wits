import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// Architecture fitness gates — the EXECUTABLE version of a code-quality audit.
//
// Each case runs the real scanner, so structural debt can't grow and new debt can't appear. These
// live in the test suite on purpose: they run on every PR through the job you already have, rather
// than as a separate workflow that costs runner-minutes, or a prose note that drifts.
//
// To move a budget, edit its <name>-budget.json in the same PR (a deliberate, reviewed act) or run
// the scanner with --update, which only ever ratchets DOWN.
//
// The scanners arrive on PATH from the harness-gates plugin. If a gate is red, fix the finding —
// never the gate.
const gate = (bin) => {
  try {
    execFileSync(bin, { cwd: process.cwd(), stdio: "pipe" });
  } catch (err) {
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    assert.fail(`${bin} reported debt over budget:\n\n${out}`);
  }
};

test("no source file exceeds its committed line budget", () => gate("harness-arch-scan"));
test("duplication has not grown past its budget", () => gate("harness-dupe-scan"));
test("dead code has not grown past its budget", () => gate("harness-dead-scan"));
test("the spec gap has not grown past its budget", () => gate("harness-spec-gap-scan"));
test("copy-pasted blocks have not grown past their budget", () => gate("harness-clone-scan"));
test("every incident has a banked lesson", () => gate("harness-incident-scan"));

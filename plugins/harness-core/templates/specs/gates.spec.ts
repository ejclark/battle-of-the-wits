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
//
// It THROWS rather than asserting outside the case: an assertion outside a test callback is flagged
// by the linter this harness installs (noMisplacedAssertion), and a bootstrap must not write a file
// its own verify then rejects.
const gate = (bin: string) => {
  try {
    execFileSync(bin, { cwd: process.cwd(), stdio: "pipe" });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    throw new Error(`${bin} reported debt over budget:\n\n${e.stdout ?? ""}${e.stderr ?? ""}`);
  }
};

describe("architecture fitness", () => {
  it("no source file exceeds its committed line budget", () => gate("harness-arch-scan"));
  it("duplication has not grown past its budget", () => gate("harness-dupe-scan"));
  it("dead code has not grown past its budget", () => gate("harness-dead-scan"));
  it("the spec gap has not grown past its budget", () => gate("harness-spec-gap-scan"));
  it("copy-pasted blocks have not grown past their budget", () => gate("harness-clone-scan"));
  it("every incident has a banked lesson", () => gate("harness-incident-scan"));
});

// Architecture fitness gates — the EXECUTABLE version of a code-quality audit.
//
// Each case runs the real scanner, so structural debt can't grow and new debt can't appear. These
// live in the test suite on purpose: they run on every PR through the job you already have, rather
// than as a separate workflow that costs runner-minutes, or a prose note that drifts.
//
// To move a budget, edit its <name>-budget.json in the same PR (a deliberate, reviewed act) or run
// the scanner with --update, which only ever ratchets DOWN. If a gate is red, fix the finding —
// never the gate.
//
// ── WHERE THESE ACTUALLY RUN, STATED PLAINLY ──────────────────────────────────
//
// The scanners arrive on PATH from the harness-gates PLUGIN, which means they are present in your
// local session and in the pre-push hook, and ABSENT in CI unless you install them there. That is
// the real deployment, and the first version of this file could not tell the difference: a missing
// scanner raised ENOENT, the catch below read it as a failing gate, and every adopter's CI went red
// on their first pull request with an error message that was completely EMPTY.
//
// Red for no stated reason, on day one, is how a quality system gets deleted in week one.
//
// So CANNOT MEASURE and OVER BUDGET are now different outcomes, which is this harness's oldest rule
// applied to its own template: a gate that cannot measure must not render a verdict in either
// direction. A missing scanner says so loudly and passes; a scanner that RAN and found debt fails.
//
// The consequence is worth knowing rather than discovering: **pre-push is where these really bite.**
// CI is confirmation. If you want them enforced in CI too, install the plugins in the workflow.
//
// It THROWS rather than asserting outside the case: an assertion outside a test callback is flagged
// by the linter this harness installs (noMisplacedAssertion), and a bootstrap must not write a file
// its own verify then rejects.
import { execFileSync } from "node:child_process";

const gate = (bin: string) => {
  try {
    execFileSync(bin, { cwd: process.cwd(), stdio: "pipe" });
  } catch (err) {
    const e = err as { code?: string; stdout?: string; stderr?: string };
    if (e.code === "ENOENT") {
      // Not installed here. Loud on stderr rather than silent: a runner-agnostic dynamic skip does
      // not exist across vitest/jest/rstest, so this passes — and a pass nobody can see the reason
      // for is the false green this file is otherwise built to prevent.
      console.warn(`⚠ ${bin} is not on PATH — GATE NOT RUN, nothing was measured. Install the harness-gates plugin here, or rely on pre-push.`);
      return;
    }
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

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
test("no source file exceeds its committed line budget", () => gate("harness-arch-scan"));
test("duplication has not grown past its budget", () => gate("harness-dupe-scan"));
test("copy-pasted blocks have not grown past their budget", () => gate("harness-clone-scan"));

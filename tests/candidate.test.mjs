import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { bin, makeRepo, runLauncher } from "./helpers.mjs";

// `--candidate` IS THE MACHINE INTERFACE.
//
// It is the first command every athlete runs — `harness-arch-scan --candidate` → take
// `candidate.file` — and the first command the governor runs when it dispatches one. Nothing
// downstream is defensive: the athletes parse stdout as JSON and read `.candidate` directly,
// because they are language models following an instruction file, not code with a try/catch.
//
// So the contract is: exit 0, exactly one JSON object on stdout, with a `candidate` key that is an
// object or null. Diagnostics go to stderr. Every gate, every time, including when the gate cannot
// measure — an athlete that cannot be given a target must be told "nothing to do", not handed a
// SyntaxError on its very first command.
//
// `harness-incident-scan --candidate` printed a bare log line and no JSON at all whenever it had no
// token or no network, which offline is always. No athlete had ever been dispatched, so nothing had
// noticed.
const GATES = [
  "harness-arch-scan",
  "harness-dupe-scan",
  "harness-dead-scan",
  "harness-spec-gap-scan",
  "harness-clone-scan",
  "harness-incident-scan",
];

/** A repo with real, measurable debt: two files defining the same symbol, one of them oversized. */
const repoWithDebt = () => {
  const root = makeRepo({
    "package.json": '{"name":"probe"}\n',
    "src/a.ts": `export function shared() {\n  return 1;\n}\n${"// filler\n".repeat(600)}`,
    "src/b.ts": "export function shared() {\n  return 1;\n}\n",
  });
  mkdirSync(join(root, "tests"), { recursive: true });
  return root;
};

/** A repo the gates can barely see: no source tree, no budgets, no network. */
const bareRepo = () => makeRepo({ "package.json": '{"name":"probe"}\n' });

const candidate = (gate, cwd) => {
  let out;
  try {
    out = runLauncher(bin("harness-gates", gate), ["--candidate"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    assert.fail(`${gate} --candidate exited non-zero:\n\n${err.stdout ?? ""}${err.stderr ?? ""}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch {
    assert.fail(`${gate} --candidate did not emit JSON on stdout. Got:\n\n${out}`);
  }
  return parsed;
};

for (const gate of GATES) {
  test(`${gate} --candidate honours the contract in a repo with debt`, () => {
    const result = candidate(gate, repoWithDebt());
    assert.ok("candidate" in result, "every gate must emit a `candidate` key");
    assert.ok(
      result.candidate === null || typeof result.candidate === "object",
      "`candidate` must be an object or null, never a bare string or number",
    );
  });

  test(`${gate} --candidate honours the contract in a bare repo`, () => {
    // The case that matters most: a gate that cannot measure must still answer in the shape the
    // caller was promised. "Nothing to do" is an answer; a parse error is a dead athlete.
    const result = candidate(gate, bareRepo());
    assert.ok("candidate" in result);
    assert.ok(result.candidate === null || typeof result.candidate === "object");
  });
}

test("a gate that finds debt names a concrete target", () => {
  // A contract that only guarantees the SHAPE would be satisfied by a gate that always answers
  // null. The point of --candidate is that it picks; assert it actually does.
  const root = repoWithDebt();
  writeFileSync(join(root, "package.json"), '{"name":"probe"}\n');
  const arch = candidate("harness-arch-scan", root);
  assert.equal(typeof arch.candidate?.file, "string", "arch must name the file to split");
  const dupe = candidate("harness-dupe-scan", root);
  assert.equal(dupe.candidate?.name, "shared", "dupe must name the copied symbol");
  assert.ok(dupe.candidate?.files?.length >= 2, "and every file defining it");
});

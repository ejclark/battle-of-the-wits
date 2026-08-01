import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

// CI must not verify a dimension the project's own command cannot.
//
// A backtick typo in a shell string went green locally and red in CI, because shellcheck ran only in
// the workflow — while being installed on the machine that made the mistake. A 200ms check became a
// commit-push-wait cycle, and the wait is where people quietly stop verifying.
//
// So this reads the workflow and asserts that every `run:` command in the verify job is reachable
// from `npm run verify` — either because verify runs it, or because the suite covers it. A step that
// is genuinely CI-only (installing a tool, fetching history) declares itself with an ALLOWED entry
// and a reason, so the exceptions stay few and visible instead of accumulating unread.
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

// CI-only by nature, each with the reason it cannot run locally.
const ALLOWED = [
  { re: /^actions\//, why: "a marketplace action, not a command" },
  { re: /apt-get/, why: "installs the tool the suite then uses" },
  { re: /npm ci$/, why: "environment setup" },
  { re: /npm i -g @anthropic-ai\/claude-code/, why: "installs the CLI validator" },
  { re: /claude plugin validate/, why: "requires the Claude CLI, which an adopter may not have" },
  { re: /shellcheck plugins/, why: "covered by tests/shell.test.mjs, which runs the same binary" },
  { re: /npx commitlint/, why: "needs the PR commit range; `npm run commitlint` is the local form" },
  { re: /npm test$/, why: "is the suite" },
  { re: /npm run (validate|check-versions|verify)$/, why: "part of `npm run verify`" },
];

test("every verify step is reachable from the project's own commands", () => {
  const wf = readFileSync(join(REPO, ".github/workflows/pipeline.yml"), "utf8");
  const verifyJob = wf.slice(wf.indexOf("  verify:"), wf.indexOf("  release:"));
  // A `run: |` block puts its commands on the FOLLOWING lines. A first version of this parser only
  // matched `run:` itself, so every multi-line step — which is where shellcheck actually lives —
  // contributed nothing, and the gate passed by seeing almost nothing. Caught by a negative control
  // that failed to fail. Exactly the bug this gate exists to prevent, in the gate that prevents it.
  const commands = [];
  const lines = verifyJob.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)(?:- )?(run|uses):\s*(\|?)\s*(.*)$/);
    if (!m) continue;
    const [, indent, , block, inline] = m;
    if (block === "|") {
      for (let j = i + 1; j < lines.length; j++) {
        const body = lines[j];
        if (body.trim() === "") continue;
        if (body.search(/\S/) <= indent.length) break; // dedented out of the block
        commands.push(body.trim());
      }
    } else if (inline) {
      commands.push(inline);
    }
  }
  const steps = commands
    .flatMap((line) => line.split("&&").map((x) => x.trim()))
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"));
  assert.ok(
    steps.some((s) => /shellcheck/.test(s)),
    "the parser found no shellcheck step — it is reading the workflow wrong, not the workflow",
  );
  const orphans = steps.filter((s) => !ALLOWED.some((a) => a.re.test(s)));
  assert.deepEqual(
    orphans,
    [],
    "CI runs commands the project's own verify cannot reach:\n  " +
      `${orphans.join("\n  ")}\n\n` +
      "Add it to `npm run verify` (or the suite), or declare it CI-only in ALLOWED with a reason.",
  );
});

test("the verify script runs every locally-runnable check", () => {
  const scripts = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8")).scripts;
  assert.ok(scripts.verify, "there must be one command that runs what CI runs");
  for (const required of ["validate", "check-versions", "test"]) {
    assert.match(scripts.verify, new RegExp(`\\b${required}\\b`), `verify must include ${required}`);
  }
});

// The DNA expression test — can the harness run in a repo it did not grow in?
//
// "Portable" is a claim until something proves it. This builds a throwaway repository with a
// DELIBERATELY NON-DEFAULT layout (`lib/` + `spec/`, not `src/` + `tests/`), points the harness at
// it with a capability descriptor, and asserts the gates behave.
//
// The trap this is written to avoid: a scanner aimed at a directory that doesn't exist finds zero
// problems and exits 0 — a false green that looks exactly like success. So every case here plants a
// KNOWN violation and requires the gate to CATCH it. A gate that passes because it scanned nothing
// fails this suite.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BIN = join(dirname(fileURLToPath(import.meta.url)), "../plugins/harness-gates/bin");

/**
 * Run a gate in `cwd`; returns { code, out }. Never throws on a non-zero exit — that's a result.
 * Invokes the `bin/` launcher rather than the module directly, so the launcher itself is under
 * test: a broken wrapper is exactly as fatal to an adopter as a broken scanner.
 */
function runGate(name, cwd, args = []) {
  try {
    const out = execFileSync(join(BIN, name), args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, out };
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

/** A scratch repo using lib/ and spec/ — nothing the harness defaults to. */
function makeRepo(files, descriptor = { sourceDir: "lib", testDir: "spec", specSuffix: ".test.ts" }) {
  const root = mkdtempSync(join(tmpdir(), "botw-"));
  writeFileSync(join(root, "harness.json"), JSON.stringify(descriptor, null, 2));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

test("arch-scan reads sourceDir from the descriptor and catches an over-budget file", () => {
  const root = makeRepo({
    "lib/huge.ts": `export const x = 1;\n${"// filler\n".repeat(700)}`,
    "lib/small.ts": "export const y = 2;\n",
  });
  try {
    const { code, out } = runGate("harness-arch-scan", root);
    assert.equal(code, 1, "a 700-line file must breach the default cap");
    assert.match(out, /huge\.ts/, "the report must name the offending file in lib/");
    // Proves it scanned lib/ rather than finding nothing: a missing dir cannot produce this finding.
    assert.match(out, /small\.ts/, "the small file in lib/ must also have been measured");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("arch-scan passes a clean repo under a non-default layout", () => {
  const root = makeRepo({
    "lib/a.ts": "export const a = 1;\n",
    "lib/b.ts": "export const b = 2;\n",
  });
  try {
    const { code, out } = runGate("harness-arch-scan", root);
    assert.equal(code, 0, "two tiny files are within budget");
    assert.match(out, /a\.ts/, "must have actually measured the files, not scanned an empty path");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("dupe-scan finds a symbol defined in two files under the descriptor's sourceDir", () => {
  const dup = "export function clamp(v) {\n  return v;\n}\n";
  const root = makeRepo({ "lib/one.ts": dup, "lib/two.ts": dup });
  try {
    // A first run GRANDFATHERS: with no budget file, existing debt is frozen rather than blocked,
    // so exit 0 is correct here. What must be true is that it SAW the duplication.
    const { out } = runGate("harness-dupe-scan", root);
    assert.match(out, /clamp/, "the duplicated symbol must be named");
    assert.match(out, /lib\/one\.ts/, "must report the file under the descriptor's sourceDir");
    assert.match(out, /debt.*1/s, "one symbol in two files is a debt of 1");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("dupe-scan blocks NEW duplication once a budget is committed", () => {
  // The ratchet is the actual contract: freeze today's debt, then refuse growth. This is the case
  // that would let real drift through if the descriptor were being ignored.
  const dup = "export function clamp(v) {\n  return v;\n}\n";
  const root = makeRepo({
    "lib/one.ts": dup,
    "lib/two.ts": dup,
    "dupe-budget.json": JSON.stringify({ duplicateDefs: 0 }),
  });
  try {
    const { code, out } = runGate("harness-dupe-scan", root);
    assert.equal(code, 1, "debt of 1 against a committed budget of 0 must fail the gate");
    assert.match(out, /clamp/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("spec-gap-scan pairs specs from the descriptor's testDir and specSuffix", () => {
  const root = makeRepo({
    "lib/covered.ts": "export const covered = 1;\n",
    "lib/naked.ts": "export const naked = 2;\n",
    "spec/covered.test.ts": 'import { covered } from "../lib/covered";\n',
  });
  try {
    const { out } = runGate("harness-spec-gap-scan", root);
    assert.match(out, /naked\.ts/, "the untested file must be reported as a gap");
    assert.doesNotMatch(
      out.replace(/naked\.ts/g, ""),
      /covered\.ts/,
      "the file with a spec in spec/*.test.ts must NOT be reported — proves the suffix was honored",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("defaults apply when no descriptor is present", () => {
  const root = makeRepo(
    { "src/huge.ts": `export const x = 1;\n${"// filler\n".repeat(700)}` },
    // Written, then removed below — this case must run with NO harness.json at all.
    {},
  );
  try {
    rmSync(join(root, "harness.json"));
    const { code, out } = runGate("harness-arch-scan", root);
    assert.equal(code, 1, "with no descriptor the harness must fall back to src/ and still work");
    assert.match(out, /huge\.ts/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/**
 * A scratch repository laid out as `lib/` + `spec/`, on a branch, with a local roster.
 *
 * Zoning is the one gate whose planted violation has to be planted TWICE, in opposite directions. A
 * table with `src/` hardcoded refuses `lib/thing.ts` to a builder — which looks exactly like the gate
 * working. Only the second case, where a builder must be PERMITTED, can tell those apart.
 */
function makeZonedRepo(principals) {
  const root = makeRepo(
    {
      "lib/base.ts": "export const base = 1;\n",
      "spec/.keep": "",
      "documentation/.keep": "",
      ".harness/roster.json": JSON.stringify(principals),
    },
    { sourceDir: "lib", testDir: "spec", docsDir: "documentation", specSuffix: ".test.ts" },
  );
  const git = (...a) => execFileSync("git", a, { cwd: root, stdio: "pipe", encoding: "utf8" });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "probe@example.com");
  git("config", "user.name", "probe");
  git("add", "-A");
  git("commit", "-qm", "init");
  git("checkout", "-qb", "work");
  return root;
}

const ROSTER = [
  { id: "scribe", kind: "human", tier: "contributor" },
  { id: "smith", kind: "human", tier: "builder" },
];

test("zoning refuses a contributor reaching into the descriptor's sourceDir", () => {
  const root = makeZonedRepo(ROSTER);
  try {
    writeFileSync(join(root, "lib/thing.ts"), "export const thing = 1;\n");
    const { code, out } = runGate("harness-preflight", root, ["--as", "scribe"]);
    assert.equal(code, 1, "a contributor writing source must be refused");
    assert.match(out, /lib\/thing\.ts/, "the refusal must name the planted file, in lib/ not src/");
    assert.match(out, /contributor radius/, "and must say which radius was exceeded");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("zoning permits a builder in the SAME directory — proving the radius was derived, not guessed", () => {
  // The negative control. A hardcoded `src/` table refuses lib/ to everyone and would pass the case
  // above for entirely the wrong reason; this is the assertion it cannot survive.
  const root = makeZonedRepo(ROSTER);
  try {
    writeFileSync(join(root, "lib/thing.ts"), "export const thing = 1;\n");
    const { code, out } = runGate("harness-preflight", root, ["--as", "smith"]);
    assert.equal(code, 0, `a builder writing lib/ must pass under this descriptor:\n${out}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("zoning honours the descriptor's testDir and docsDir for a contributor", () => {
  const root = makeZonedRepo(ROSTER);
  try {
    writeFileSync(join(root, "spec/thing.test.ts"), "// spec\n");
    writeFileSync(join(root, "documentation/guide.md"), "# guide\n");
    const { code, out } = runGate("harness-preflight", root, ["--as", "scribe"]);
    assert.equal(code, 0, `spec/ and documentation/ are inside the contributor radius here:\n${out}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("zoning fails CLOSED for a principal the roster does not know", () => {
  const root = makeZonedRepo(ROSTER);
  try {
    writeFileSync(join(root, "documentation/guide.md"), "# guide\n");
    const { code, out } = runGate("harness-preflight", root, ["--as", "stranger"]);
    assert.equal(code, 1, "an unknown principal must be refused, never waved through");
    assert.match(out, /nothing is permitted/, "and the message must state the rule rather than imply it");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("standing reports the zoning table under a non-default layout and never invents a roster", () => {
  const root = makeRepo({ "harness.json": JSON.stringify({ sourceDir: "lib", testDir: "spec", docsDir: "documentation" }) });
  try {
    const zoned = runGate("harness-standing", root, ["--zoning"]);
    assert.equal(zoned.code, 0);
    assert.match(zoned.out, /source lib\//, "the table must print the layout actually in use");
    assert.match(zoned.out, /specs spec\//);

    // No roster is the normal case: it must read as silence, not as a pass and not as a failure.
    const report = runGate("harness-standing", root);
    assert.equal(report.code, 0, "a repo with no roster must exit 0");
    assert.match(report.out, /No roster/);
    assert.doesNotMatch(report.out, /visitor\s+\d/, "it must not invent principals to report on");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("every gate is executable and survives a repo with nothing to scan", () => {
  // Not a correctness test — a crash test. A gate pointed at an empty repo must exit cleanly
  // rather than throwing ENOENT, because that is what a fresh adopter's first run looks like.
  const root = makeRepo({ "lib/.keep": "" });
  const gates = ["harness-arch-scan", "harness-dupe-scan", "harness-dead-scan", "harness-spec-gap-scan"];
  try {
    for (const gate of gates) {
      const { out } = runGate(gate, root);
      assert.doesNotMatch(out, /ENOENT|Cannot find module|is not a function/, `${gate} crashed: ${out}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

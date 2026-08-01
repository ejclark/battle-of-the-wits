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
    const { code, out } = runGate("harness-dupe-scan", root);
    assert.equal(code, 1, "the same symbol in two files is duplication debt above a zero budget");
    assert.match(out, /clamp/, "the duplicated symbol must be named");
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

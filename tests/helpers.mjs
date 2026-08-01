// Shared test scaffolding.
//
// Extracted when the clone gate flagged `makeRepo` pasted across three suites. Unlike the scanners —
// standalone PATH executables that deliberately must not import across that boundary — test files
// are ordinary modules in one tree, so there is no reason for them to each own a copy.
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const PLUGINS = join(dirname(fileURLToPath(import.meta.url)), "../plugins");
export const bin = (plugin, name) => join(PLUGINS, plugin, "bin", name);

/** A throwaway repository seeded with exactly the files a case needs. */
export function makeRepo(files = {}) {
  const root = mkdtempSync(join(tmpdir(), "botw-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

/** Run a harness executable in `cwd`. A non-zero exit is a RESULT, not a throw — gates fail on purpose. */
export function runTool(binPath, cwd, args = [], env = {}) {
  const opts = { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...env } };
  try {
    return { code: 0, out: execFileSync(binPath, args, opts) };
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

/** Strip ANSI so assertions pin meaning rather than escape codes. */
export const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");

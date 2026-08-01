#!/usr/bin/env node
// DISPATCH PROTOCOL — the bracket every athlete runs inside.
//
//   harness-dispatch --acquire <agent> <path>...   # slot + territory, or refuse
//   harness-dispatch --release <agent>             # give both back
//
// The rails exist separately — fleet control, territory claims, blast-radius preflight — and asking
// each athlete to remember all of them in the right order is how a rail gets skipped. An athlete that
// forgets to claim does not fail loudly; it quietly collides with another an hour later. So the
// sequence is one command, and the agent definitions call it rather than reciting it.
//
// ACQUIRE IS ALL-OR-NOTHING. If territory is held, the fleet slot taken in the same breath is handed
// straight back — a half-acquired athlete would hold a slot it cannot use, and the cap would then
// refuse work that should have run. Partial failure in a coordination primitive is worse than
// refusal, because it degrades quietly.
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BIN = join(dirname(fileURLToPath(import.meta.url)), "../bin");
const ROOT = process.cwd();

// The sibling launchers are `#!/bin/sh` with `.cmd` twins. On Windows the shell file is unrunnable
// and Node cannot spawn the `.cmd` directly (EINVAL, the CVE-2024-27980 hardening) — a bare
// execFileSync of either was caught as a non-zero result, so acquire refused every slot with no
// output. Resolve the `.cmd` and route it through `cmd.exe`, which runs it; explicit argv, no shell.
const win = process.platform === "win32";
function tool(name, args) {
  const launcher = join(BIN, win ? `${name}.cmd` : name);
  const [file, pre] = win ? ["cmd.exe", ["/d", "/s", "/c", launcher]] : [launcher, []];
  try {
    return { code: 0, out: execFileSync(file, [...pre, ...args], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

function acquire(agent, paths) {
  const slot = tool("harness-fleet", ["--start", agent]);
  process.stdout.write(slot.out);
  if (slot.code !== 0) return slot.code;

  const territory = tool("harness-claim", [agent, ...paths]);
  process.stdout.write(territory.out);
  if (territory.code !== 0) {
    // Hand the slot back rather than holding one we cannot use.
    tool("harness-fleet", ["--stop", agent]);
    console.error(`  slot released — ${agent} acquired nothing.`);
    return territory.code;
  }

  console.log(`\n  ${agent} is cleared to work on: ${paths.join(", ")}`);
  console.log("  When done, BEFORE opening a PR:  harness-preflight --agent " + agent);
  console.log(`  Then release:                    harness-dispatch --release ${agent}\n`);
  return 0;
}

function release(agent) {
  // Release is best-effort on BOTH rails and never short-circuits: a failure to release territory
  // must not also strand a fleet slot. Stranded coordination state is the thing that silently
  // serialises a fleet, and it is exactly what nobody notices until throughput has already fallen.
  const territory = tool("harness-claim", ["--release", agent]);
  process.stdout.write(territory.out);
  const slot = tool("harness-fleet", ["--stop", agent]);
  process.stdout.write(slot.out);
  return territory.code === 0 && slot.code === 0 ? 0 : 1;
}

const argv = process.argv.slice(2);
if (argv[0] === "--acquire" && argv.length >= 3) process.exit(acquire(argv[1], argv.slice(2)));
else if (argv[0] === "--release" && argv[1]) process.exit(release(argv[1]));
else {
  console.error("usage: harness-dispatch --acquire <agent> <path>... | --release <agent>");
  process.exit(2);
}

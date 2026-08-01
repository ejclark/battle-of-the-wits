#!/usr/bin/env node
// FLEET CONTROL — a WIP cap, a kill switch, and a token ceiling.
//
//   harness-fleet --start <agent>     # register a run; refuses if capped, halted, or out of budget
//   harness-fleet --stop <agent>      # release the slot
//   harness-fleet --spend <agent> <n> # record tokens burned
//   harness-fleet --status            # slots, spend, halt state
//   harness-fleet --halt / --resume   # the switch
//
// This is the rail that makes "we have tokens to burn" safe to act on. If tokens are the fuel, this
// is the fuel gauge and the ignition cut-off — a safety rail, not an optimisation.
//
// ⚠ HONEST LIMIT, STATED RATHER THAN IMPLIED: --halt stops agents from STARTING. It does not kill a
// running process; a JSON file cannot send a signal. An agent already mid-flight finishes its current
// unit of work and is then refused a new one. If you need a hard stop, kill the processes — this is
// the brake, not the airbag. Anything that claimed otherwise would be worse than no switch at all,
// because you would trust it in the moment you most needed it to be true.
//
// Configuration lives in harness.json under `fleet`, so it travels with the repo being worked on
// rather than with the harness — the run limits of a small project and a monorepo are not the same
// number, and the harness has no business deciding which.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readRegistry, withLock, writeRegistry } from "./registry.mjs";

const ROOT = process.cwd();
const SLOT_TTL_MS = Number(process.env.HARNESS_FLEET_TTL_MS ?? 2 * 60 * 60 * 1000);

const config = (() => {
  const defaults = { maxConcurrent: 3, tokenCeiling: null };
  try {
    return { ...defaults, ...(JSON.parse(readFileSync(join(ROOT, "harness.json"), "utf8")).fleet ?? {}) };
  } catch {
    return defaults;
  }
})();

const load = () => readRegistry(ROOT, "fleet");
const save = (entries) => writeRegistry(ROOT, "fleet", entries);

const halted = () => load().some((e) => e.kind === "halt");
const runs = () => load().filter((e) => e.kind === "run");
const spent = () => load().reduce((sum, e) => sum + (e.tokens ?? 0), 0);

function start(agent) {
  return withLock(ROOT, "fleet", SLOT_TTL_MS, () => {
    if (halted()) {
      console.error("✗ fleet is HALTED — no agent may start. `harness-fleet --resume` to lift it.");
      return 1;
    }
    const active = runs();
    if (active.some((r) => r.agent === agent)) {
      console.log(`✓ ${agent} already holds a slot`);
      return 0;
    }
    if (active.length >= config.maxConcurrent) {
      console.error(`✗ WIP cap reached — ${active.length}/${config.maxConcurrent} slots in use:\n`);
      for (const r of active) console.error(`    ${r.agent}`);
      console.error("\n  Wait for one to finish, or raise `fleet.maxConcurrent` in harness.json.");
      console.error("  The cap exists because parallel work stops paying once review capacity binds.");
      return 1;
    }
    if (config.tokenCeiling !== null && spent() >= config.tokenCeiling) {
      console.error(`✗ token ceiling reached — ${spent().toLocaleString()} / ${config.tokenCeiling.toLocaleString()}`);
      console.error("  A runaway loop must not burn the month. Raise the ceiling deliberately, or stop.");
      return 1;
    }
    save([...load(), { kind: "run", agent, started: Date.now(), expires: Date.now() + SLOT_TTL_MS }]);
    console.log(`✓ ${agent} started — ${active.length + 1}/${config.maxConcurrent} slots`);
    return 0;
  });
}

const stop = (agent) =>
  withLock(ROOT, "fleet", SLOT_TTL_MS, () => {
    save(load().filter((e) => !(e.kind === "run" && e.agent === agent)));
    console.log(`✓ ${agent} released its slot`);
    return 0;
  });

const spend = (agent, tokens) =>
  withLock(ROOT, "fleet", SLOT_TTL_MS, () => {
    // Spend is recorded WITHOUT an expiry: a slot is transient, but what it cost is not. Expiring
    // spend would let a long session quietly reset its own ceiling.
    save([...load(), { kind: "spend", agent, tokens, at: Date.now() }]);
    const total = spent();
    const ceiling = config.tokenCeiling;
    console.log(
      `✓ ${agent} +${tokens.toLocaleString()} tokens${ceiling ? ` — ${total.toLocaleString()}/${ceiling.toLocaleString()}` : ` — ${total.toLocaleString()} total`}`,
    );
    return ceiling !== null && total >= ceiling ? 1 : 0;
  });

function status() {
  const active = runs();
  console.log(`\n  fleet — ${halted() ? "HALTED" : "running"}`);
  console.log(`  slots  ${active.length}/${config.maxConcurrent}`);
  const ceiling = config.tokenCeiling;
  console.log(`  spend  ${spent().toLocaleString()}${ceiling ? ` / ${ceiling.toLocaleString()}` : " (no ceiling set)"}`);
  if (active.length) {
    console.log("");
    for (const r of active) {
      console.log(`    ${r.agent}   ${Math.round((Date.now() - r.started) / 60000)}m`);
    }
  }
  console.log("");
  return 0;
}

const halt = () =>
  withLock(ROOT, "fleet", SLOT_TTL_MS, () => {
    save([...load().filter((e) => e.kind !== "halt"), { kind: "halt", at: Date.now() }]);
    console.log("✓ fleet HALTED — no agent may start.");
    console.log("  Note: agents already running finish their current unit of work. This is the brake,");
    console.log("  not a signal — kill the processes if you need them to stop now.");
    return 0;
  });

const resume = () =>
  withLock(ROOT, "fleet", SLOT_TTL_MS, () => {
    save(load().filter((e) => e.kind !== "halt"));
    console.log("✓ fleet resumed");
    return 0;
  });

const argv = process.argv.slice(2);
const [cmd, a, b] = argv;
if (cmd === "--start" && a) process.exit(start(a));
else if (cmd === "--stop" && a) process.exit(stop(a));
else if (cmd === "--spend" && a && b) process.exit(spend(a, Number(b)));
else if (cmd === "--status") process.exit(status());
else if (cmd === "--halt") process.exit(halt());
else if (cmd === "--resume") process.exit(resume());
else {
  console.error("usage: harness-fleet --start|--stop <agent> | --spend <agent> <n> | --status | --halt | --resume");
  process.exit(2);
}

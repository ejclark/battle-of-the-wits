#!/usr/bin/env node
// WHICH GEAR — how much thinking this work actually needs, decided from evidence rather than by asking.
//
//   harness-gear                          # what gear the evidence calls for right now
//   harness-gear --signal irreversible --signal regression
//   harness-gear --json                   # the same, for a caller
//
// THE PROBLEM. Effort is not free and it is not linear. A high-effort pass on a rename costs the one
// resource this whole system treats as scarce — the human waiting for it — and buys nothing, because
// there was no decision in the work to think about. Run everything at maximum and you have optimised
// for the hardest 5% of the work at the expense of every command in the other 95%.
//
// THE TRAP, AND IT IS THE REASON THIS IS A MODULE AND NOT A PARAGRAPH OF ADVICE. The obvious fix is
// "let the session pick its own gear." But calibration — knowing what you do not know — is the FIRST
// thing to degrade when effort comes down. So a policy of self-selection hands the decision to the
// configuration whose judgment was just reduced, and the failure is silent: a cheap pass does not
// announce that it was out of its depth, it produces a confident answer that is wrong in a way
// nothing catches. That is this project's defining failure mode wearing a new hat.
//
// So the gear is NOT a judgment call. It is a function of things already on the record:
//
//   FLOOR comes from EVIDENCE. A preflight refusal, a test that was green before this edit, a second
//   attempt at the same change, a gate red twice — none of these require anyone to assess their own
//   competence. They are facts, and each one sets a MINIMUM gear that nothing may go below.
//
//   CEILING comes from HEADROOM. Remaining API budget caps what any of this is allowed to spend.
//
//   AND WHEN THE CEILING FALLS BELOW THE FLOOR, THIS REFUSES. That single rule is the safety
//   property. The tempting behaviour — quietly run the irreversible change on a cheaper tier because
//   that is what is affordable — produces work that looks finished at a quality nobody was told
//   about. Downgrading in silence is a false green, and the honest move when you cannot afford to do
//   something safely is to say so and stop.
//
// DEGRADES HONESTLY. With no way to measure headroom there is no ceiling and no refusal — an
// unmeasurable budget must never become a silent throttle, in either direction.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// The ladder is ABSTRACT on purpose. Model names are vendor state with their own release cadence;
// hardcoding them here would make this file wrong on someone else's schedule, and a harness that has
// to be edited when a model ships is not portable. These four rungs map onto whatever effort control
// the session actually has, and the mapping is the one line a caller supplies.
export const GEARS = ["mechanical", "standard", "careful", "deep"];

const rank = (g) => GEARS.indexOf(g);
const higher = (a, b) => (rank(a) >= rank(b) ? a : b);

// Every entry is an OBSERVABLE, not an opinion. If a signal here cannot be established without
// someone judging their own depth, it does not belong in this table — that is the whole design.
export const FLOORS = {
  irreversible: "deep", //      workflows, credentials, settings — preflight's refusal class
  refused: "deep", //           a preflight refusal already fired on this change
  regression: "careful", //     a test that passed before this edit does not pass now
  reverted: "careful", //       second attempt at a change that was already backed out
  gateRedTwice: "careful", //   the cheap pass is not converging on its own
  thrashing: "careful", //      tool calls accumulating with nothing written
  novel: "careful", //          no procedure exists for this yet, so there is nothing to execute
  drill: "mechanical", //       a written procedure — the thinking is done, running it is not thinking
  formatting: "mechanical", //  rename, format, budget update, typo
};

/** The lowest gear the evidence permits. Unknown signals are ignored rather than guessed at. */
export function floorFor(signals = []) {
  const seen = signals.filter((s) => s in FLOORS);
  // "standard" is the floor when nothing fired, NOT "mechanical": absence of evidence that the work
  // is hard is not evidence that it is easy, and the cheapest rung has to be earned by a signal.
  const raisers = seen.filter((s) => rank(FLOORS[s]) > rank("standard"));
  if (raisers.length) return raisers.reduce((acc, s) => higher(acc, FLOORS[s]), "standard");
  // Only a positive mechanical signal, with nothing pulling up, drops below standard.
  return seen.length && seen.every((s) => FLOORS[s] === "mechanical") ? "mechanical" : "standard";
}

/** The highest gear the remaining budget affords. `null` means unmeasurable — no cap, and say so. */
export function ceilingFor(fraction) {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) return null;
  if (fraction > 0.5) return "deep";
  if (fraction > 0.2) return "careful";
  if (fraction > 0.05) return "standard";
  return "mechanical";
}

/**
 * Remaining budget as a fraction of the window, from the ledger and the account's declared limit.
 *
 * The limit is ACCOUNT state, not repository state, so it arrives by environment variable and is
 * never written into a file this repository could commit — a number that is true of one person's
 * plan has exactly the same problem as a budget that is true of one project.
 */
export function headroom(ledgerFile, env = process.env) {
  const limit = Number(env.HARNESS_TOKEN_LIMIT);
  if (!Number.isFinite(limit) || limit <= 0) return null;
  const windowMs = Number(env.HARNESS_TOKEN_WINDOW_MS ?? 5 * 60 * 60 * 1000);
  if (!existsSync(ledgerFile)) return null;
  let spent = 0;
  const since = Date.now() - windowMs;
  for (const line of readFileSync(ledgerFile, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line);
      if (Date.parse(rec.at) >= since) spent += Number(rec.tokens) || 0;
    } catch {
      // A malformed line is a corrupt record, not a reason to refuse to measure the rest.
    }
  }
  return Math.max(0, 1 - spent / limit);
}

/**
 * The recommendation. `refuse` is set when the evidence demands more than the budget can fund —
 * the one outcome that must not resolve itself by picking the affordable gear anyway.
 */
export function gear({ signals = [], fraction = null } = {}) {
  const floor = floorFor(signals);
  const ceiling = ceilingFor(fraction);
  const fired = signals.filter((s) => s in FLOORS);
  const why = fired.length ? `evidence: ${fired.join(", ")}` : "no signal fired — the standing default";

  if (ceiling === null) {
    return { gear: floor, floor, ceiling: null, refuse: false, why, note: "headroom unmeasurable — no ceiling applied" };
  }
  if (rank(ceiling) < rank(floor)) {
    return {
      gear: null,
      floor,
      ceiling,
      refuse: true,
      why,
      note: `this work needs ${floor} and the remaining budget affords at most ${ceiling}. Running it cheap would finish at a quality nobody was told about. Wait for the window, raise HARNESS_TOKEN_LIMIT, or split the change so the part that needs ${floor} stands alone.`,
    };
  }
  // Never spend above what the evidence asked for just because the budget is there. Unused headroom
  // is not waste; it is what pays for the next thing that genuinely needs deep.
  return { gear: floor, floor, ceiling, refuse: false, why, note: null };
}

// ── CLI ────────────────────────────────────────────────────────────────────────
// Guarded so importing this module for its functions never runs the command.
if (process.argv[1] && process.argv[1].endsWith("gear.mjs")) {
  const argv = process.argv.slice(2);
  const signals = argv.flatMap((a, i) => (a === "--signal" && argv[i + 1] ? [argv[i + 1]] : []));
  const unknown = signals.filter((s) => !(s in FLOORS));
  // Read the descriptor here rather than importing harness-gates' copy: the two plugins are
  // installed independently and a scanner that only works when its sibling is present is a scanner
  // that fails at the one moment nobody is watching. Missing descriptor means the documented
  // default, never inference.
  const metricsFile = (() => {
    try {
      return JSON.parse(readFileSync(join(process.cwd(), "harness.json"), "utf8")).metricsFile ?? "docs/metrics.jsonl";
    } catch {
      return "docs/metrics.jsonl";
    }
  })();
  const fraction = headroom(join(process.cwd(), metricsFile));
  const result = gear({ signals, fraction });

  if (argv.includes("--json")) {
    console.log(JSON.stringify({ ...result, unknownSignals: unknown }, null, 2));
    process.exit(result.refuse ? 1 : 0);
  }

  // An unrecognised signal is reported rather than ignored: a caller that misspells `regression`
  // gets a lower gear than the evidence called for, which is exactly the silent downgrade above.
  if (unknown.length) console.error(`  ⚠ ignored — not observable signals: ${unknown.join(", ")}\n`);

  if (result.refuse) {
    console.error(`✗ not enough headroom to run this safely\n\n    needs:    ${result.floor}\n    affords:  ${result.ceiling}\n    ${result.why}\n\n  ${result.note}\n`);
    process.exit(1);
  }
  console.log(`\n  gear: ${result.gear}\n    ${result.why}`);
  console.log(result.ceiling ? `    budget affords up to ${result.ceiling}` : `    ${result.note}`);
  console.log("");
}

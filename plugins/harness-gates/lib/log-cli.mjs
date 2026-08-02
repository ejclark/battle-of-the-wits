#!/usr/bin/env node
// The CLI over `ledger.mjs`. Split for the reason every read surface here is split from its model:
// a view may report what the record says, and may never become a second source of truth about it.
import { append, ledgerPath, read, summarise } from "./ledger.mjs";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
// Named for what it returns rather than for what it parses: `incident-scan` has a `flag` of its own
// with different behaviour, and two helpers sharing a generic name is a coincidence, not an
// abstraction — the same call the preflight made when it renamed `files` to `touched`.
const argValue = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : null;
};

function ledgerReport() {
  const { records, unreadable } = read(ROOT);
  if (!records.length) {
    console.log(`
  No ledger yet — nothing recorded, and nothing is wrong.

  It appears the first time something writes one, at ${ledgerPath(ROOT).replace(ROOT, ".")}.
  Records are appended, never edited, and committed: this is repo state, and git is the store.
`);
    return 0;
  }

  const { byKind, retired, accepted, gates, span } = summarise(records);
  console.log(`\n  Run ledger — ${records.length} record(s), ${span[0]?.slice(0, 10)} → ${span[1]?.slice(0, 10)}\n`);

  for (const [kind, n] of [...byKind].sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(5)}  ${kind}`);

  if (retired || accepted) {
    console.log(`\n  Ratchet — ${retired} line(s) retired, ${accepted} accepted as justified growth.`);
    console.log("  Both directions are recorded on purpose: a ledger that logged only improvement");
    console.log("  would be a scoreboard, and the accepted raises are the ones worth re-reading later.");
  }

  if (gates.size) {
    console.log("\n  Gates — how often each one actually fired:\n");
    for (const [gate, g] of [...gates].sort((a, b) => b[1].failed - a[1].failed)) {
      console.log(`    ${gate.padEnd(24)} ${g.failed}/${g.runs} failed`);
    }
    console.log("\n  The gate that fires most is where the rework is, which is a different question");
    console.log("  from which gate matters most. Neither number is a verdict on the gate.");
  }

  if (unreadable) console.log(`\n  ${unreadable} line(s) could not be parsed and were skipped — the history is still readable.`);

  // WHAT THIS MUCH DATA CAN AND CANNOT SUPPORT, stated by the tool rather than left to the reader.
  //
  // Hard data outranks theory about the thing it MEASURED, and that is exactly why a thin ledger is
  // dangerous: extrapolating from six records is theory wearing a number's clothes, and it borrows
  // the credibility of measurement without having earned any of it. A report that printed a direction
  // from an anecdote would be the false green this whole harness exists to prevent, in the one
  // surface people would trust most.
  //
  // The threshold is a judgement, not a statistic, and is stated as one. Anything under a couple of
  // dozen boundaries is a story about a few days.
  const SUPPORTS_TREND = 20;
  console.log(
    records.length < SUPPORTS_TREND
      ? `\n  ${records.length} record(s) is an ANECDOTE, not a trend. These are counts of what happened,
  and they support no claim about direction — read them as "this occurred", never as "this is
  getting better or worse". Come back after ~${SUPPORTS_TREND}.\n`
      : `\n  ${records.length} records is enough to read direction, and only for what was actually
  measured. An extrapolation beyond these fields is a theory — hold it to a theory's standard
  rather than to this table's.\n`,
  );
  return 0;
}

if (argv.includes("--report")) process.exit(ledgerReport());

if (argv.includes("--tail")) {
  const n = Number(argv[argv.indexOf("--tail") + 1]) || 20;
  for (const r of read(ROOT).records.slice(-n)) console.log(JSON.stringify(r));
  process.exit(0);
}

const kind = argValue("event");
if (!kind) {
  console.error("usage: harness-log --event <kind> [--<field> <value>]... | --report | --tail [n]");
  process.exit(2);
}

// Every remaining `--key value` pair becomes a field. The schema is open because the useful field is
// usually the one nobody anticipated; identity fields are dropped by the ledger, not by this parser.
const fields = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith("--") || argv[i] === "--event") continue;
  const key = argv[i].slice(2);
  const value = argv[i + 1];
  if (value && !value.startsWith("--")) fields[key] = Number.isNaN(Number(value)) ? value : Number(value);
}
console.log(JSON.stringify(append(ROOT, kind, fields)));

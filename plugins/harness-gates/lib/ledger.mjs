#!/usr/bin/env node
// THE RUN LEDGER — the measurements this system takes about ITSELF, written down before they vanish.
//
//   harness-log --event <kind> [--<field> <value>]...   # append one record
//   harness-log --report                                # what the record says so far
//   harness-log --tail [n]                              # the last n records, raw
//
// WHY THIS EXISTS, AND WHY IT IS NOT A DATABASE.
//
// A retro on one run produced numbers that changed a decision: three workflows, 26 agents, 2.85M
// tokens, and a design half that shipped nothing while the adversarial half paid for everything.
// Every one of those figures came from git and from committed files — 51 commits, 19 budget
// snapshots, 34 incident entries — with no infrastructure at all. **Git is already the database:**
// append-only, content-addressed, fully historical, provenanced, and every adopter has one.
//
// Exactly one class of measurement was NOT durable: what a RUN cost while it happened. Those numbers
// lived in a session and died with it. You cannot mine data you never recorded, and that asymmetry is
// the entire argument for writing this now rather than when a query needs it — recording costs
// almost nothing, and not recording is unrecoverable in a way that is invisible until you look back
// and find nothing there.
//
// So the gap is not storage. It is CAPTURE. This closes the capture gap and deliberately does not
// touch storage:
//
//   · JSONL, append-only, committed. Queryable with `jq` today, loadable into DuckDB or SQLite in one
//     command the day it outgrows that — which is the migration path, and it is free.
//   · No service to run, nothing to provision, nothing to back up. An adopter installs plugins; they
//     do not stand up Postgres, and a harness that required one would stop being portable.
//   · `merge=union` in .gitattributes, so two branches appending in parallel merge without conflict.
//     An append-only log with a normal merge driver conflicts on every concurrent write, which is how
//     a metrics file quietly gets deleted by the first person in a hurry.
//
// **The trigger for a real database is a QUERY YOU CAN STATE AND CANNOT ANSWER** — not a row count,
// and not a feeling that the data deserves better. "Which gate fires most often in the first hour of
// a session" is answerable with `jq` over a decade of this. When one genuinely is not, that question
// specifies the schema, and building storage before it exists means guessing the schema and being
// wrong in a way that is expensive to undo.
//
// NO ACTOR FIELD, EVER. This records WHAT HAPPENED, never WHO DID IT. A per-person performance log is
// a different product with a different ethics, and the aggregation trap is already documented one
// door down: individually innocuous entries accreting into a profile nobody decided to publish. The
// schema is the defence — you cannot query a column that does not exist.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { descriptor } from "./descriptor.mjs";

const FORBIDDEN_FIELDS = new Set(["actor", "author", "who", "user", "principal", "email", "name"]);

/** Where the ledger lives for this repository. Repo state, so the descriptor names it. */
export function ledgerPath(root) {
  return join(root, descriptor(root).metricsFile);
}

/**
 * Append one record. `at` is stamped here so no caller can backdate one, and unknown fields are
 * carried through — the schema is deliberately open, because the useful field is usually the one
 * nobody anticipated. Identity fields are the one closed part, and they are dropped rather than
 * rejected: a caller that tried is usually a script being helpful, and failing their run teaches them
 * to stop logging rather than to stop identifying.
 */
export function append(root, kind, fields = {}) {
  const clean = Object.fromEntries(Object.entries(fields).filter(([k]) => !FORBIDDEN_FIELDS.has(k.toLowerCase())));
  const record = { at: new Date().toISOString(), kind, ...clean };
  const file = ledgerPath(root);
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify(record)}\n`);
  return record;
}

/**
 * Read the ledger. A malformed line is SKIPPED AND COUNTED rather than fatal.
 *
 * An append-only log written by concurrent processes will eventually contain a torn line, and a
 * reader that throws on it makes the whole history unreadable because of one bad byte. Counting the
 * skips keeps that honest — silently dropping them would be a reader that flatters its own input.
 */
export function read(root) {
  const file = ledgerPath(root);
  if (!existsSync(file)) return { records: [], unreadable: 0 };
  const records = [];
  let unreadable = 0;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      unreadable++;
    }
  }
  return { records, unreadable };
}

/** Aggregate by kind, and by whichever dimension each kind actually carries. Derived, never stored. */
export function summarise(records) {
  const byKind = new Map();
  for (const r of records) byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + 1);

  const ratchet = records.filter((r) => r.kind === "ratchet");
  const retired = ratchet.filter((r) => r.direction === "down").reduce((n, r) => n + (Number(r.delta) || 0), 0);
  const accepted = ratchet.filter((r) => r.direction === "up").reduce((n, r) => n + (Number(r.delta) || 0), 0);

  const gates = new Map();
  for (const r of records.filter((x) => x.kind === "gate" && x.gate)) {
    const g = gates.get(r.gate) ?? { runs: 0, failed: 0 };
    g.runs++;
    if (r.result === "fail") g.failed++;
    gates.set(r.gate, g);
  }

  return { byKind, retired, accepted, gates, span: [records[0]?.at ?? null, records.at(-1)?.at ?? null] };
}

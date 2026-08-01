// The run ledger — an append-only record of what this system measured about itself.
//
// Three properties carry the whole design, and each one fails silently if it is wrong:
//
//   · APPEND-ONLY. A writer that rewrites the file loses history, and loses it in a way nobody
//     notices until they look back for something that should be there.
//   · NO IDENTITY, EVER. The schema is the defence against a per-person performance log — you cannot
//     query a column that does not exist. A field filter that quietly stopped working would be
//     invisible, because the records still look fine.
//   · A TORN LINE IS NOT FATAL. Concurrent appenders eventually produce one, and a reader that throws
//     makes an entire history unreadable over a single bad byte.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { append, ledgerPath, read, summarise } from "../plugins/harness-gates/lib/ledger.mjs";
import { makeRepo } from "./helpers.mjs";

test("records append, never replace", () => {
  const root = makeRepo({});
  append(root, "gate", { gate: "arch", result: "fail" });
  append(root, "gate", { gate: "arch", result: "pass" });
  append(root, "ratchet", { direction: "down", delta: 12 });

  const { records } = read(root);
  assert.equal(records.length, 3, "every append must survive the next one");
  assert.deepEqual(
    records.map((r) => r.kind),
    ["gate", "gate", "ratchet"],
    "and must stay in the order they happened — this is a timeline, not a set",
  );
  assert.ok(records.every((r) => typeof r.at === "string"), "every record is stamped by the writer");
});

test("identity fields are dropped, whatever they are called", () => {
  // The aggregation trap, closed at the schema. A caller that passes one is usually a script trying
  // to be helpful, so the field is discarded rather than the run being failed — failing them teaches
  // people to stop logging, which loses the data instead of the identity.
  const root = makeRepo({});
  const rec = append(root, "note", {
    tokens: 100,
    actor: "someone",
    Author: "someone",
    email: "a@example.invalid",
    principal: "tony",
    name: "A Person",
    who: "me",
    user: "u",
  });
  assert.deepEqual(Object.keys(rec).sort(), ["at", "kind", "tokens"]);
  assert.doesNotMatch(readFileSync(ledgerPath(root), "utf8"), /someone|example\.invalid|tony|A Person/);
});

test("a torn line is skipped and counted, never fatal", () => {
  const root = makeRepo({});
  append(root, "gate", { gate: "arch" });
  writeFileSync(ledgerPath(root), `${readFileSync(ledgerPath(root), "utf8")}{"kind":"tor\n`, { flag: "w" });
  append(root, "gate", { gate: "dupe" });

  const { records, unreadable } = read(root);
  assert.equal(records.length, 2, "the readable records must still be readable");
  assert.equal(unreadable, 1, "and the damage must be reported rather than hidden");
});

test("an absent ledger reads as empty, not as an error", () => {
  const { records, unreadable } = read(makeRepo({}));
  assert.deepEqual(records, []);
  assert.equal(unreadable, 0);
});

test("the ledger path comes from the descriptor, not from a hardcoded name", () => {
  const root = makeRepo({ "harness.json": JSON.stringify({ metricsFile: "telemetry/runs.jsonl" }) });
  assert.match(ledgerPath(root), /telemetry\/runs\.jsonl$/);
  append(root, "note", { x: 1 });
  assert.equal(read(root).records.length, 1, "and the writer and reader must agree about where it is");
});

test("the summary counts both ratchet directions separately", () => {
  // A ledger that recorded only improvement would be a scoreboard. Accepted raises are the entries
  // most worth re-reading later, so they must survive aggregation as their own number.
  const { retired, accepted, byKind } = summarise([
    { kind: "ratchet", direction: "down", delta: 30 },
    { kind: "ratchet", direction: "down", delta: 12 },
    { kind: "ratchet", direction: "up", delta: 51 },
    { kind: "gate", gate: "arch", result: "fail" },
  ]);
  assert.equal(retired, 42);
  assert.equal(accepted, 51, "a raise must never be netted against a reduction — they are different events");
  assert.equal(byKind.get("ratchet"), 3);
});

test("gate outcomes aggregate to runs and failures per gate", () => {
  const { gates } = summarise([
    { kind: "gate", gate: "arch", result: "fail" },
    { kind: "gate", gate: "arch", result: "pass" },
    { kind: "gate", gate: "dupe", result: "pass" },
  ]);
  assert.deepEqual(gates.get("arch"), { runs: 2, failed: 1 });
  assert.deepEqual(gates.get("dupe"), { runs: 1, failed: 0 });
});

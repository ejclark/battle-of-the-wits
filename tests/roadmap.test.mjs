// A roadmap is the document most likely to become confidently wrong, because nothing about it fails
// when it stops being true. The on-ramp's task list already proved that here: three tasks, checked
// against the repository when written, and two of them false within a week — pointed at the person
// least able to tell.
//
// So the same treatment. These do not check that the plan is GOOD, which is a taste call and not a
// test's business. They check that it is still a plan: every phase has an observable exit, every
// phase admits what blocks it, and a draft is labelled as a draft.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { missingPathsIn } from "./helpers.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOC = readFileSync(join(REPO, "docs/ROADMAP.md"), "utf8");

/** Each `## ` section above the Shipped record. */
function phases() {
  const body = DOC.split("\n## Shipped")[0];
  return [...body.matchAll(/^## (.+)$/gm)]
    .map((m, i, all) => ({
      title: m[1],
      body: body.slice(m.index, all[i + 1]?.index ?? body.length),
    }))
    .filter((p) => !/^How this file stays honest$/.test(p.title));
}

test("every phase says what done looks like, in checkable terms", () => {
  // A phase with no observable exit is a heading. It can never be finished, so it never leaves, and
  // a roadmap that only accumulates is a bank with worse formatting.
  const all = phases();
  assert.ok(all.length >= 3, `only ${all.length} phases parsed — the structure changed or the file is too thin to be a plan`);
  for (const p of all) {
    assert.match(p.body, /\*\*Done when:\*\*/, `phase "${p.title}" never says what done looks like`);
  }
});

test("every phase admits what it is blocked on, or says nothing explicitly", () => {
  // Half of planning is admitting what cannot start yet. An omitted blocker reads as "ready", and
  // somebody picks it up and finds out the expensive way.
  for (const p of phases()) {
    assert.match(p.body, /\*\*Blocked on:\*\*/, `phase "${p.title}" does not say what blocks it — silence reads as ready`);
  }
});

test("a draft is labelled as a draft", () => {
  // The whole reason this file can exist at all. Direction is a taste call and belongs to the owner;
  // a proposal assembled by a session must be impossible to mistake for a decision — including by a
  // future session reading it cold, which is the reader most likely to act on it.
  //
  // When Eric overwrites it, this test goes red and that is the signal to delete the label. Same
  // inversion as the on-ramp task pins: improvement is what breaks it.
  const isDraft = /Claude's draft/.test(DOC);
  if (isDraft) {
    assert.match(DOC, /proposal/i, "a draft must say it is a proposal, not just who wrote it");
    assert.match(DOC, /Eric's to make|owner/i, "and must name whose decision it actually is");
  } else {
    // No draft marker means somebody took ownership. Then it must not still read as a proposal.
    assert.doesNotMatch(DOC, /Claude's draft/, "the draft marker was half-removed");
  }
});

test("the shipped record keeps its evidence rather than becoming a list of claims", () => {
  // A shipped item with nothing behind it is indistinguishable from one that was quietly abandoned,
  // and this file is a record of what was decided rather than a list of intentions.
  const shipped = DOC.split("\n## Shipped")[1] ?? "";
  assert.ok(shipped.trim(), "the shipped record is gone — that is the half that makes this a record");
  const items = [...shipped.matchAll(/^- \*\*(.+?)\*\*/gm)];
  assert.ok(items.length > 0, "no shipped items parsed");
  for (const m of items) {
    const entry = shipped.slice(m.index, shipped.indexOf("\n- ", m.index + 1) + 1 || undefined);
    assert.match(entry, /Evidence:/, `shipped item "${m[1]}" cites no evidence`);
  }
});

test("every file the roadmap points at exists", () => {
  // The on-ramp's exact failure, arriving in the document most likely to repeat it.
  const missing = missingPathsIn(DOC, REPO);
  assert.deepEqual(missing, [], `the roadmap names files that do not exist: ${missing.join(", ")}`);
});

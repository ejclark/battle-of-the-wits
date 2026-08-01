import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { renderCampaigns } from "../plugins/harness-core/lib/campaigns.mjs";
import { openIdeas, parseIdeas } from "../plugins/harness-core/lib/ideas.mjs";
import { makeRepo } from "./helpers.mjs";

// `--today` could only ever propose CLEANING, because budgets were the only thing it read. On a
// repository where every gate is green it answered with low-urgency housekeeping — an honest answer
// to a narrower question than the one being asked. This lets banked ideas compete.
//
// Two rules, and the cases exist to hold them: nothing is invented, and the one derived signal
// (how many other ideas point at this one) is presented as a PROXY rather than as a verdict.

const LOG = `# Ideas

## Inbox (captured, not yet started)

**1. A first idea.** It stands alone.
_(src: Eric · while: a walk)_

**2. A second idea.** This one leans on #1 and also on #1 again.

**3. A third idea.** Builds on #1 and #2.
_(src: Claude · while: reviewing)_

## In progress

**4. Being built already.** Should never be offered.

## Shipped (recent)

**5. Long done.** Also never offered.
`;

test("open ideas are parsed; closed sections are not", () => {
  const titles = parseIdeas(LOG).map((i) => i.n);
  assert.deepEqual(titles, [1, 2, 3], "in-progress and shipped entries are not candidates to build");
});

test("who points at whom is derived, and a duplicate reference counts once", () => {
  const byN = Object.fromEntries(parseIdeas(LOG).map((i) => [i.n, i]));
  assert.deepEqual(byN[1].inbound, [2, 3], "#1 is referenced by two other ideas");
  assert.deepEqual(byN[2].refs, [1], "#2 mentions #1 twice; that is one association");
});

test("an idea citing its own number is a formatting artefact, not an association", () => {
  const [idea] = parseIdeas("## Inbox\n\n**7. Self.** See #7 for context.\n");
  assert.deepEqual(idea.refs, []);
  assert.deepEqual(idea.inbound, []);
});

test("the source trailer travels with the idea, and its absence is fine", () => {
  const byN = Object.fromEntries(parseIdeas(LOG).map((i) => [i.n, i]));
  assert.match(byN[1].src, /Eric/);
  assert.equal(byN[2].src, null);
});

test("heading-style logs parse too — the format is a convention, not a law", () => {
  const ideas = parseIdeas("## Inbox\n\n### 4. Numbered heading\n\nbody\n\n### An unnumbered one\n\nbody\n");
  assert.deepEqual(ideas.map((i) => i.title), ["Numbered heading", "An unnumbered one"]);
  assert.equal(ideas[1].n, null, "an unnumbered idea is still an idea");
});

test("most-referenced first, ties broken by the order they were written", () => {
  const order = openIdeas(makeRepo({ "docs/IDEAS.md": LOG })).map((i) => i.n);
  assert.deepEqual(order, [1, 2, 3]);
});

test("a repository with no idea log gets silence, not an invented dungeon", () => {
  assert.deepEqual(openIdeas(makeRepo({})), []);
});

test("a log in an unrecognised shape parses to nothing rather than crashing", () => {
  // Same posture every gate takes toward a dimension it cannot measure: say nothing, claim nothing.
  assert.deepEqual(parseIdeas("# Notes\n\nJust prose, no entries at all.\n"), []);
});

// ── placement, which is derived rather than decided ─────────────────────────────────────────────

/** A repo with a real, frozen budget violation — so there is measured debt to rank against. */
function repoWithDebt(extra = {}) {
  const root = makeRepo({ "harness.json": '{"sourceDir":"src","sourceExt":".ts"}', ...extra });
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src/big.ts"), "x\n".repeat(400));
  writeFileSync(join(root, "arch-budget.json"), JSON.stringify({ "src/big.ts": 100 }));
  return root;
}

test("with real debt on the board, building goes last — fix what is broken first", () => {
  const out = renderCampaigns(repoWithDebt({ "docs/IDEAS.md": LOG }), "probe");
  assert.ok(out.indexOf("The Foundry") < out.indexOf("The Drawing Board"), "debt outranks proposals");
});

test("with everything green, building leads — then it is the only real answer", () => {
  const out = renderCampaigns(makeRepo({ "docs/IDEAS.md": LOG, "arch-budget.json": "{}", "dupe-budget.json": '{"duplicateDefs":0}', "dead-budget.json": '{"deadCode":0}', "spec-gap-budget.json": '{"untestedFiles":0}', "clone-budget.json": '{"clones":0}', "docs/LESSONS.md": "# Lessons\n" }), "probe");
  assert.match(out, /1\.\s+The Drawing Board/);
});

test("the ranking is offered as a proxy, never as a verdict", () => {
  // The line that keeps this honest. A tool that ranked ideas and did not say how would be inventing
  // authority it does not have.
  const out = renderCampaigns(makeRepo({ "docs/IDEAS.md": LOG }), "probe");
  assert.match(out, /PROXY/);
  assert.match(out, /not a verdict/);
});

test("no idea log means no Drawing Board at all", () => {
  assert.doesNotMatch(renderCampaigns(repoWithDebt(), "probe"), /Drawing Board/);
});

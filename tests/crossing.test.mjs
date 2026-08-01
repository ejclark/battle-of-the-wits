// The crossing campaign — the one dungeon derived from people rather than from budgets.
//
// Its whole risk is flattery. Every other campaign is grounded in a committed budget, so it cannot
// report progress that did not happen. This one reads a hand-written roster, which means the failure
// mode is a repository being shown an encouraging picture of a journey nobody is actually on. The
// cases below are mostly about the campaign REFUSING to appear.
import assert from "node:assert/strict";
import { test } from "node:test";
import { theCrossing } from "../plugins/harness-core/lib/crossing.mjs";
import { makeRepo } from "./helpers.mjs";

const withRoster = (principals) => makeRepo({ ".harness/roster.json": JSON.stringify(principals) });

test("no roster means no crossing — silence, not an invented journey", () => {
  assert.equal(theCrossing(makeRepo({})), null);
});

test("one human is not a crossing, however many agents there are", () => {
  const root = withRoster([
    { id: "eric", kind: "human", tier: "owner" },
    { id: "decomposer", kind: "agent", tier: "builder" },
    { id: "mortician", kind: "agent", tier: "builder" },
  ]);
  assert.equal(theCrossing(root), null, "a fleet is not company — this is where every repo starts");
});

test("a corrupt roster does not crash the campaign list", () => {
  assert.equal(theCrossing(makeRepo({ ".harness/roster.json": "{{{" })), null);
});

test("two humans open the crossing, and every human is an encounter", () => {
  const root = withRoster([
    { id: "eric", kind: "human", tier: "owner" },
    { id: "newcomer", kind: "human", tier: "visitor" },
    { id: "decomposer", kind: "agent", tier: "builder" },
  ]);
  const c = theCrossing(root);
  assert.ok(c, "two humans is a crossing");
  assert.deepEqual(
    c.encounters.map((e) => e.label),
    ["eric", "newcomer"],
    "humans are the encounters; agents are counted but are not the fight",
  );
  assert.match(c.theme, /2 humans and 1 agent/);
  assert.equal(c.weight, -1, "must never outrank a measured finding — nothing here came from a gate");
});

test("the payoff refuses to promise the thing the premise assumes", () => {
  // The honest half. Onboarding COSTS the constraint before it relieves it, and a campaign that
  // said "doubles your throughput" would be the flattery this whole suite exists to prevent.
  const c = theCrossing(withRoster([{ id: "a", kind: "human" }, { id: "b", kind: "human" }]));
  assert.match(c.payoff, /SLOWS the leader before it speeds the party/);
});

test("a contributor with nothing merged is surfaced as the next pitch", () => {
  const waiting = theCrossing(withRoster([
    { id: "eric", kind: "human", tier: "owner" },
    { id: "newcomer", kind: "human", tier: "visitor" },
  ]));
  assert.match(waiting.payoff, /1 of them has nothing merged yet/);

  const landed = theCrossing(withRoster([
    { id: "eric", kind: "human", tier: "owner" },
    { id: "newcomer", kind: "human", tier: "contributor" },
  ]));
  assert.doesNotMatch(landed.payoff, /nothing merged yet/, "and the line disappears once it is untrue");
});

test("a tier the campaign does not recognise reads as undefined rather than as permission", () => {
  const c = theCrossing(withRoster([
    { id: "a", kind: "human", tier: "owner" },
    { id: "b", kind: "human", tier: "archmage" },
  ]));
  assert.match(c.encounters[1].detail, /no radius defined/, "an unknown tier must never render as access");
});

test("kind defaults to human, so an entry without one is not silently uncounted", () => {
  const c = theCrossing(withRoster([{ id: "a" }, { id: "b" }]));
  assert.ok(c, "two entries with no explicit kind are two humans");
  assert.match(c.theme, /2 humans and 0 agents/);
});

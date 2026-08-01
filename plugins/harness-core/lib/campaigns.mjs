// CAMPAIGNS — group the standing bosses into coherent dungeons, each with one payoff.
//
// A flat list is a backlog wearing a costume: it says what is wrong and leaves you to work out what
// any of it BUYS. A campaign is the answer to "what should I build today?" — fights that belong
// together, with one value statement for finishing them, so the decision is about outcomes.
//
// **Bosses are grouped by the capability they unlock together**, not by which scanner found them, so
// the reward is honest rather than a label glued on afterwards. Prerequisites are real: decomposing
// what nothing asserts on is the dangerous order, so verification gates the structural campaign.
import { theCrossing } from "./crossing.mjs";
import { drawingBoard } from "./ideas.mjs";
import { bossList, unlitDimensions } from "./state.mjs";

/** Each dungeon claims the boss kinds it can resolve. Order here is presentation order. */
const DUNGEONS = [
  {
    id: "proving-grounds",
    name: "The Proving Grounds",
    theme: "Nothing here can be verified. Every other fight is riskier until that changes.",
    claims: ["spec-gap"],
    payoff:
      "You can refactor without fear. This is the capability every structural fight silently depends on — it is worth doing FIRST even though it looks least urgent.",
    party: "test-backfiller — behavioural specs against observable behaviour, never a rewrite",
  },
  {
    id: "the-foundry",
    name: "The Foundry",
    theme: "Files that have grown past the point where a change is cheap.",
    claims: ["god-file"],
    payoff:
      "Changes in this area stop getting more expensive. The ratchet makes it permanent — every budget you lower can never rise again.",
    party: "decomposer — one behaviour-preserving extraction per PR",
    after: "proving-grounds",
  },
  {
    id: "mirror-halls",
    name: "The Mirror Halls",
    theme: "The same idea, written down in more than one place, drifting quietly apart.",
    claims: ["duplication", "clone"],
    payoff:
      "One source per idea, so a fix lands once instead of N times — and the copies stop disagreeing without telling anyone.",
    party: "ui-librarian — diff behaviour FIRST; near-duplicates that differ stay separate under distinct names",
  },
];

function campaigns(root) {
  const bosses = bossList(root);
  const dark = unlitDimensions(root);

  const built = DUNGEONS.map((d) => {
    const encounters = bosses.filter((b) => d.claims.includes(b.kind));
    return {
      ...d,
      encounters,
      weight: encounters.reduce((sum, e) => sum + e.weight, 0),
    };
  }).filter((d) => d.encounters.length > 0);

  // Unlit dimensions lead when present: fighting in the dark is how you pick the wrong fight.
  if (dark.length) {
    built.unshift({
      id: "the-unmapped",
      name: "The Unmapped",
      theme: `${dark.length} dimension${dark.length === 1 ? "" : "s"} this repository cannot currently see.`,
      encounters: dark.map((d) => ({ label: d.label, detail: d.fix, stat: "unlit" })),
      payoff:
        "You find out what is actually here. Every other dungeon is a guess until this one is cleared — an unmeasured dimension is not a passing grade, it is a blind spot.",
      party: "you, with one command per dimension",
      weight: Number.POSITIVE_INFINITY,
    });
  }

  // THE DRAWING BOARD — the only campaign proposing a BUILD rather than a cleanup, because budgets
  // are all this command otherwise reads. Placement is DERIVED: debt first, and this leads only
  // when there is none — at which point it is the answer.
  const board = drawingBoard(root);
  if (board) built[built.length ? "push" : "unshift"](board);

  // THE CROSSING — the only campaign about the repository's PEOPLE rather than its code. It leads
  // when present, ahead of even an unlit dimension, and that placement is an argument rather than a
  // preference: a contributor mid-onboarding is a person waiting, and a person waiting decays in a
  // way a budget does not. Debt keeps. Someone deciding whether they are wanted here does not.
  const crossing = theCrossing(root);
  if (crossing) built.unshift(crossing);

  return built;
}

export function renderCampaigns(root, name) {
  const found = campaigns(root);
  const L = [];
  L.push("");
  L.push(`  ⛬  DUNGEONS AVAILABLE — ${name ?? root.split("/").pop()}`);
  L.push("");

  if (!found.length) {
    L.push("  None. Every dimension is measured, every budget is met, and nothing is banked.");
    L.push("  The honest move is to lower a budget on purpose, or go write an idea down.");
    L.push("");
    return L.join("\n");
  }

  found.forEach((d, i) => {
    const gate = d.after && found.some((x) => x.id === d.after);
    L.push(`  ${i + 1}.  ${d.name}${gate ? "   ⚠ locked" : ""}`);
    L.push(`      ${d.theme}`);
    L.push("");
    for (const e of d.encounters.slice(0, 4)) {
      L.push(`        · ${e.detail ?? e.label}${e.stat ? `   (${e.stat})` : ""}`);
    }
    if (d.encounters.length > 4) L.push(`        · …and ${d.encounters.length - 4} more`);
    L.push("");
    L.push(`      ✦ CLEARING THIS BUYS  ${d.payoff}`);
    L.push(`      ⚔ party  ${d.party}`);
    if (gate) L.push(`      ⚠ clear ${found.find((x) => x.id === d.after).name} first — decomposing what nothing asserts on is the dangerous order`);
    L.push("");
  });

  L.push("  Pick one. The others do not go away, and clearing this one changes what the next list holds.");
  L.push("");
  return L.join("\n");
}

// CAMPAIGNS — group the standing bosses into coherent dungeons, each with one payoff.
//
// The forge lists encounters. A flat list is a backlog wearing a costume: it tells you what is wrong
// and leaves you to work out what any of it BUYS. A campaign is the answer to "what should I build
// today?" — a small set of fights that belong together, with a single value statement for finishing
// them, so the decision is about outcomes rather than items.
//
// The grouping axis is deliberate: **bosses are grouped by the capability they unlock together**, not
// by which scanner found them. Two findings from different gates belong in the same dungeon when
// clearing both buys one thing; two findings from the same gate belong apart when they don't. That is
// what makes the reward statement honest rather than a label glued on afterwards.
//
// Prerequisites are real, not flavour. Decomposing code that nothing asserts on is the dangerous
// order, so the verification campaign gates the structural one — stated on the dungeon, where the
// decision is actually made.
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

  // The unmapped is only a dungeon when there is genuinely something unlit. It is offered FIRST when
  // present, because fighting in the dark is how you pick the wrong fight.
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

  return built;
}

export function renderCampaigns(root, name) {
  const found = campaigns(root);
  const L = [];
  L.push("");
  L.push(`  ⛬  DUNGEONS AVAILABLE — ${name ?? root.split("/").pop()}`);
  L.push("");

  if (!found.length) {
    L.push("  None. Every dimension is measured and every budget is met.");
    L.push("  The honest move is to lower a budget on purpose, or go build something new.");
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

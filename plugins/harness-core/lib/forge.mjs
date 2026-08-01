// THE FORGE — generate a new dungeon from what is actually in the repository.
//
// `harness-dungeon` shows the ADOPTION dungeon: five fixed chambers everyone walks once. This
// generates a fresh one from measured state, so the dungeon a repo gets is the dungeon it has
// earned. Two repos never get the same crawl, and the same repo gets a different crawl next month.
//
// Choose-your-own-adventure is the load-bearing mechanic, not the theme: the run ends with a HAND of
// distinct next moves rather than a ranked backlog. A ranked list is someone else's decision handed
// over for rubber-stamping; a hand of genuinely different characters — the biggest threat, the
// quickest win, the darkest unknown — is a decision you actually make. Picking one changes what the
// next hand contains, which is where the branching lives.
//
// Every encounter is derived from a committed budget. Nothing here is invented, and nothing is
// offered that the repo cannot currently see — unmeasured dimensions become fog, never silence.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readJson } from "./state.mjs";

/** One encounter per real, named target — sized so it fits in a single reviewable PR. */
function encounters(root) {
  const out = [];

  const arch = readJson(root, "arch-budget.json") ?? {};
  const biggest = Object.entries(arch)
    .filter(([, v]) => typeof v === "number")
    .sort((a, b) => b[1] - a[1]);

  if (biggest.length) {
    const [file, lines] = biggest[0];
    out.push({
      kind: "boss",
      name: "The Colossus",
      target: file,
      stat: `${lines} lines`,
      why: "The largest file in the repository. Every future change to this area pays a comprehension tax, and the tax compounds.",
      move: "harness-decompose — one behaviour-preserving extraction, then ratchet the budget down.",
      unlocks: "a permanently lower ceiling on this file — the ratchet never lets it back up",
      weight: lines,
    });
  }
  if (biggest.length > 2) {
    const mid = biggest[Math.min(2, biggest.length - 1)];
    out.push({
      kind: "skirmish",
      name: "The Quickening",
      target: mid[0],
      stat: `${mid[1]} lines`,
      why: "Mid-sized and far cheaper to split than the Colossus. The fastest way to prove the drill works before spending real effort on it.",
      move: "harness-decompose — the same drill, a third of the fight.",
      unlocks: "confidence in the loop, and a lower budget for the price of one small PR",
      weight: Math.floor(mid[1] / 2),
    });
  }

  const dupe = readJson(root, "dupe-budget.json");
  if (dupe?.duplicateDefs > 0) {
    out.push({
      kind: "boss",
      name: "The Hydra",
      target: `${dupe.duplicateDefs} duplicated definitions`,
      stat: "dupe budget",
      why: "The same name defined in many files. Cut one head carelessly and you get the clamp/NaN lesson — the gate measures name collision, not behavioural identity, so this one demands a differential before treatment.",
      move: "harness-dedupe — diff behaviour FIRST, consolidate only what is genuinely identical.",
      unlocks: "one source per symbol, and a lower duplication ceiling",
      weight: dupe.duplicateDefs * 6,
    });
  }

  const gap = readJson(root, "spec-gap-budget.json");
  if (gap?.untested > 0) {
    out.push({
      kind: "swarm",
      name: "The Unwatched",
      target: `${gap.untested} modules with no spec`,
      stat: "spec gap",
      why: "Code nothing asserts on. Not a crisis on its own — it is what makes every OTHER fight riskier, because you cannot refactor what you cannot verify.",
      move: "test-backfiller — behavioural specs against observable behaviour, never a rewrite.",
      unlocks: "safe decomposition; this is the prerequisite the Colossus quietly depends on",
      weight: gap.untested * 4,
      before: "The Colossus",
    });
  }

  const clone = readJson(root, "clone-budget.json");
  if (clone?.clones > 0) {
    out.push({
      kind: "skirmish",
      name: "The Echo",
      target: `${clone.clones} copy-pasted blocks`,
      stat: "clone budget",
      why: "Pasted blocks drift apart silently — the two copies stop agreeing and nothing reports it.",
      move: "harness-clone-scan to locate, then consolidate the ones that are genuinely one idea.",
      unlocks: "a lower clone ceiling",
      weight: clone.clones * 3,
    });
  }

  return out;
}

/** What the repo cannot currently see. Fog is an encounter too — the move is to light it. */
function unlit(root) {
  const out = [];
  const has = (p) => existsSync(join(root, p));
  for (const [budget, label, fix] of [
    ["dead-budget.json", "dead code", "npm i -D knip, commit a knip.json, then harness-dead-scan --update"],
    ["spec-gap-budget.json", "the spec gap", "harness-spec-gap-scan --update"],
    ["clone-budget.json", "copy-paste", "harness-clone-scan --update"],
    ["dupe-budget.json", "duplication", "harness-dupe-scan --update"],
    ["arch-budget.json", "file size", "harness-arch-scan --update"],
  ]) {
    if (!has(budget)) out.push({ label, fix });
  }
  if (!has("docs/LESSONS.md")) {
    out.push({ label: "incidents", fix: "harness-bootstrap writes docs/LESSONS.md — nothing is learning today" });
  }
  return out;
}

export function forge(root) {
  const found = encounters(root).sort((a, b) => b.weight - a.weight);
  const dark = unlit(root);
  const L = [];

  L.push("");
  L.push("  ⛬  A NEW DUNGEON HAS BEEN FORGED");
  L.push(`     ${root.split("/").pop()} · ${found.length} encounters · ${dark.length} unlit`);
  L.push("");

  if (found.length === 0 && dark.length === 0) {
    L.push("  The repository is clean and fully measured. There is nothing here to fight.");
    L.push("  Push somewhere new, or lower a budget on purpose to raise the floor.");
    L.push("");
    return L.join("\n");
  }

  for (const e of found) {
    L.push(`  ${e.kind === "boss" ? "☠" : e.kind === "swarm" ? "⁂" : "†"}  ${e.name}   ${e.target}  (${e.stat})`);
    L.push(`      ${e.why}`);
    L.push(`      → ${e.move}`);
    L.push(`      ✦ ${e.unlocks}`);
    if (e.before) L.push(`      ⚠ fight this BEFORE ${e.before} — it is the prerequisite`);
    L.push("");
  }

  if (dark.length) {
    L.push("  ▸ UNLIT — dimensions this repo cannot currently see");
    for (const d of dark) L.push(`      · ${d.label}  —  ${d.fix}`);
    L.push("");
  }

  // The hand. Three genuinely different characters, never a ranked list.
  L.push("  ▸ YOUR MOVE — pick one, and the next hand changes");
  const boss = found.find((e) => e.kind === "boss");
  const quick = found.find((e) => e.kind === "skirmish");
  if (boss) L.push(`      1 · Fight ${boss.name} — the biggest threat, the longest fight`);
  if (quick) L.push(`      2 · Fight ${quick.name} — the quickest win, proves the loop`);
  if (dark.length) L.push(`      3 · Light the dark — measure ${dark[0].label}, and find out what is really here`);
  if (!boss && !quick && !dark.length) L.push("      (no moves — the dungeon is cleared)");
  L.push("");
  L.push("  Nothing above was invented: every encounter is a committed budget, and every unlit");
  L.push("  dimension is one this repo genuinely cannot measure yet.");
  L.push("");
  return L.join("\n");
}

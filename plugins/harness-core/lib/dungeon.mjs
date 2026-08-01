#!/usr/bin/env node
// THE DUNGEON — the harness's dominant persona.
//
// A harness is a *presentation and question-set* layer over an invariant core. Nothing here changes
// what is true: the gates, budgets, ratchets and thresholds are untouched. What changes is the
// vocabulary, and — the part that actually earns its keep — WHICH QUESTION GETS ASKED FIRST.
//
// A dungeon crawler asks: where am I, what kills me, and what do I need before the boss. That is a
// better opening question for structural debt than "what is the lint score," because it forces
// route, risk and prerequisite into one view.
//
// The mapping is deliberately faithful — every element resolves to something measured, never to
// flavor:
//
//   Chambers   → the adoption phases (lib/phases.mjs). Depth is real progress.
//   Bosses     → the largest over-budget files, from the committed budgets. Real targets.
//   Loot       → CAPABILITY unlocked by clearing, not points. This is the whole thesis: merge-on-
//                green and autonomous athletes are *earned* by verification, exactly as gold-tier
//                dependency automerge is earned by test depth. Loot you cannot spend is decoration;
//                loot that unlocks a real power is a mechanic.
//   Map        → docs/adr/. A cleared room is a decision already made; the layout IS the
//                accumulated path of architecture decisions, not a second artifact to maintain.
//   Fog of war → dimensions the repo cannot currently measure. Naming what you cannot see beats
//                reporting green for it.
//
// Honest limit, stated rather than hidden: this reads committed state. It does not re-run the gates.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { detect, plan } from "./phases.mjs";

const ROOT = process.cwd();

const CHAMBERS = [
  { name: "The Threshold", phase: "1 · Install" },
  { name: "The Scrying Pool", phase: "2 · Observe" },
  { name: "The Frozen Vault", phase: "3 · Freeze" },
  { name: "The Warden's Gate", phase: "4 · Enforce" },
  { name: "The Throne", phase: "5 · Autonomy" },
];

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(join(ROOT, p), "utf8"));
  } catch {
    return null;
  }
};

/** Bosses are measured, not invented: the biggest committed budgets are the biggest files. */
function bosses() {
  const arch = readJson("arch-budget.json") ?? {};
  const found = Object.entries(arch)
    .filter(([, cap]) => typeof cap === "number")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([file, cap]) => ({ kind: "god file", name: file, stat: `${cap} lines held` }));

  const specGap = readJson("spec-gap-budget.json");
  if (specGap && typeof specGap.untested === "number" && specGap.untested > 0) {
    found.push({ kind: "the unwatched", name: `${specGap.untested} modules with no spec`, stat: "spec gap" });
  }
  const dupe = readJson("dupe-budget.json");
  if (dupe && typeof dupe.duplicateDefs === "number" && dupe.duplicateDefs > 0) {
    found.push({ kind: "the twins", name: `${dupe.duplicateDefs} duplicated definitions`, stat: "duplication" });
  }
  return found;
}

/** Loot is capability. Each item names the chamber that unlocks it — nothing is granted early. */
function loot(state, steps) {
  const done = (phase) => steps.filter((s) => s.phase === phase).every((s) => s.done);
  return [
    { name: "Ratcheting gates", have: state.budgetsFrozen, from: "The Frozen Vault" },
    { name: "The full local gate (pre-push)", have: state.hooksLive, from: "The Threshold" },
    { name: "Merge-on-green", have: done("4 · Enforce"), from: "The Warden's Gate" },
    { name: "Autonomous athletes", have: done("5 · Autonomy"), from: "The Throne" },
  ];
}

/** What the repo genuinely cannot see. An unmeasured dimension is fog, never a pass. */
function fog(state) {
  const out = [];
  if (!existsSync(join(ROOT, "node_modules/knip")) && !existsSync(join(ROOT, "knip.json"))) {
    out.push("dead code — knip is not installed, so this dimension is unmeasured");
  }
  if (!state.gatesWired) out.push("the gates are not wired into the suite — they run only when invoked by hand");
  if (!state.ledger) out.push("no lessons ledger — incidents leave no trace, so the same tuition gets paid twice");
  for (const b of ["arch", "dupe", "spec-gap", "clone"]) {
    if (!existsSync(join(ROOT, `${b}-budget.json`))) out.push(`${b} debt is unfrozen — nothing is holding the line`);
  }
  return out;
}

function map() {
  const dir = join(ROOT, "docs/adr");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^\d{4}-/.test(f) && f.endsWith(".md"))
    .sort();
}

export function render() {
  const state = detect(ROOT);
  const steps = plan(state);
  // Depth is the CONTIGUOUS prefix of finished chambers, not every finished chamber. A later phase
  // can be satisfied incidentally (a repo may already have budgets before it has a descriptor), and
  // counting that as depth would report progress the party has not actually made — you cannot be
  // past a door you never opened.
  const isDone = (c) => steps.filter((s) => s.phase === c.phase).every((s) => s.done);
  let depth = 0;
  while (depth < CHAMBERS.length && isDone(CHAMBERS[depth])) depth++;
  const cleared = CHAMBERS.slice(0, depth);
  const current = CHAMBERS[depth];
  const next = steps.find((s) => !s.done);
  const L = [];

  L.push("");
  L.push(`  ⛬  THE DUNGEON — ${ROOT.split("/").pop()}`);
  L.push(`     depth ${cleared.length} of ${CHAMBERS.length}   ·   ${current ? current.name : "cleared"}`);
  L.push("");

  L.push("  ▸ CLEARED");
  if (cleared.length === 0) L.push("      (nothing yet — you are at the door)");
  for (const c of cleared) L.push(`      ✓ ${c.name}`);
  L.push("");

  if (current && next) {
    L.push(`  ▸ CURRENT CHAMBER — ${current.name}`);
    L.push(`      → ${next.title}`);
    L.push(`        ${next.cmd}`);
    if (next.critical) L.push(`        ⚠ ${next.why}`);
    if (next.needsAdmin) L.push("        (needs repo admin — this door is opened by a human, not the party)");
    L.push("");
  }

  const bs = bosses();
  L.push("  ▸ BOSSES");
  if (bs.length === 0) {
    L.push("      none visible — either the dungeon is clean or the debt is not yet frozen");
  } else {
    for (const b of bs) L.push(`      ☠ ${b.name}   (${b.stat})`);
  }
  L.push("");

  L.push("  ▸ LOOT — capability, earned by clearing");
  for (const item of loot(state, steps)) {
    L.push(item.have ? `      ✦ ${item.name}` : `      · ${item.name}   — locked, clear ${item.from}`);
  }
  L.push("");

  const rooms = map();
  L.push("  ▸ THE MAP — decisions already made (docs/adr)");
  if (rooms.length === 0) {
    L.push("      unmapped — no ADRs. The route you took is not written down.");
  } else {
    for (const r of rooms.slice(-5)) L.push(`      ▫ ${r.replace(/\.md$/, "")}`);
    if (rooms.length > 5) L.push(`      … ${rooms.length - 5} earlier`);
  }
  L.push("");

  const f = fog(state);
  if (f.length) {
    L.push("  ▸ FOG OF WAR — what cannot currently be seen");
    for (const x of f) L.push(`      · ${x}`);
    L.push("");
  }

  L.push("  Nothing above is flavor: bosses come from committed budgets, loot is real capability,");
  L.push("  and the map is your ADR history. The mechanics are unchanged — only the question order.");
  L.push("");
  return L.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(render());

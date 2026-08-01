// THE OVERVIEW — what this repository's own instruments say, on one page.
//
// The six gates each answer their dimension honestly and separately, which is right for a gate and
// useless as a picture: you learn the numbers by running six commands and holding the answers in your
// head. This assembles them, and adds the one thing no single gate can see — **which direction the
// numbers have been moving**, which is the only question that distinguishes a repository with debt
// from one that is losing.
//
// TWO RULES, both load-bearing.
//
// NOTHING ABOUT A PERSON. Not a name, not a count of commits, not "most active". The data is right
// there in git and assembling it would take twenty lines, which is exactly why the refusal has to be
// deliberate rather than incidental. A dashboard that ranks people changes what people do, and it
// changes it toward whatever is being counted — see the dignity rule in CONTRIBUTORS.md. This
// describes the CODE.
//
// UNLIT IS NOT ZERO. A gate with no committed budget has never been frozen, and reporting it as 0
// would read as perfect. It reads as unlit, because "we have not measured this" and "this is clean"
// are different states and conflating them is the false green this project exists to prevent.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GATES, budgetTotal, readJson } from "./state.mjs";

/** Every gate, with its budget and whether it has ever been frozen. */
export function gateStates(root) {
  return GATES.map((gate) => {
    const raw = readJson(root, `${gate}-budget.json`);
    if (raw === null) return { gate, lit: false, budget: null, entries: 0 };

    // Two shapes in the wild: a bare number (one debt total) or a map of file → budget. What each
    // one TOTALS is `budgetTotal` in state.mjs, shared with the history view — a reader that
    // disagrees with the one comparing a budget against its own past would draw a move that never
    // happened.
    if (typeof raw === "number") return { gate, lit: true, budget: raw, entries: 1 };
    const keys = Object.keys(raw).filter((k) => !k.startsWith("_why"));
    return {
      gate,
      lit: true,
      budget: budgetTotal(raw),
      entries: keys.length,
      // A justified raise is the interesting artefact: somebody had to write a paragraph for it.
      justified: Object.keys(raw).filter((k) => k.startsWith("_why")).length,
    };
  });
}

/**
 * Which way the budgets have moved, from the run ledger.
 *
 * The ratchet only lowers automatically; a raise takes a written reason. So the ratio of down to up
 * is a direct read on whether this repository is paying its debt down or negotiating with itself —
 * and neither number means anything alone.
 */
export function trend(root, ledgerFile = "docs/metrics.jsonl") {
  // JSONL, so it is read as lines rather than parsed as a document. `readJson` would return null
  // here and that null means "absent", which is a different thing from "empty" — the ledger being
  // missing entirely is the state a fresh adopter is in, and it must not read as a flat trend.
  const path = join(root, ledgerFile);
  const records = (existsSync(path) ? readFileSync(path, "utf8").split("\n").filter((l) => l.trim()) : [])
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null; //  a corrupt line is one bad record, not a reason to report nothing
      }
    })
    .filter(Boolean);

  const ratchets = records.filter((r) => r.kind === "ratchet");
  const down = ratchets.filter((r) => r.direction === "down");
  const up = ratchets.filter((r) => r.direction === "up");

  return {
    records: records.length,
    // BELOW THE FLOOR, SAY SO. Direction from a handful of samples is noise wearing a trend's
    // clothes, and a dashboard that draws an arrow from four data points is lying with a picture.
    readable: ratchets.length >= 10,
    down: down.length,
    up: up.length,
    delta: [...down, ...up].reduce((sum, r) => sum + (Number(r.delta) || 0) * (r.direction === "down" ? -1 : 1), 0),
    kinds: records.reduce((acc, r) => ({ ...acc, [r.kind]: (acc[r.kind] ?? 0) + 1 }), {}),
  };
}


/**
 * The page. Deliberately uncomfortable where the data is uncomfortable.
 *
 * The first thing this repository's own overview said about itself was that eleven budget moves had
 * all gone UP and not one had come down. That is the dashboard doing its job — a read surface that
 * only ever flatters is a read surface nobody learns anything from, and the number that changes your
 * behaviour is always the one you did not want to see.
 */
export function overviewDocument(root, repoName, { gates = gateStates(root), t = trend(root) } = {}) {
  const lit = gates.filter((g) => g.lit);
  const dark = gates.filter((g) => !g.lit);

  const direction = !t.readable
    ? { tone: "quiet", label: "not enough history", detail: `${t.records} record${t.records === 1 ? "" : "s"} — direction needs at least 10 ratchets to mean anything` }
    : t.down > t.up
      ? { tone: "good", label: "paying down", detail: `${t.down} down against ${t.up} up` }
      : t.up > t.down
        ? { tone: "warn", label: "negotiating", detail: `${t.up} raises against ${t.down} reductions — every raise needed a written reason, and they were all given` }
        : { tone: "quiet", label: "level", detail: `${t.down} down, ${t.up} up` };

  const row = (g) =>
    `<tr><td>${g.gate}</td><td class="n">${g.budget ?? "—"}</td><td class="n">${g.entries || "—"}</td>` +
    `<td class="n">${g.justified ? `${g.justified} justified` : ""}</td></tr>`;

  return `<!doctype html><meta charset="utf-8"><title>${repoName} — overview</title>
<style>
:root{--ink:#16181a;--dim:#6c7378;--paper:#fbfbf9;--card:#fff;--rule:#e4e2dc;
--good:#2f6f5e;--warn:#b0602c;--quiet:#6c7378}
@media(prefers-color-scheme:dark){:root{--ink:#eceae4;--dim:#8b9296;--paper:#14161a;--card:#191c21;
--rule:#282c33;--good:#5fd7af;--warn:#e0985d;--quiet:#8b9296}}
body{font:16px/1.55 ui-serif,Georgia,serif;color:var(--ink);background:var(--paper);
max-width:46rem;margin:3.5rem auto;padding:0 1.5rem}
h1{font-size:1.5rem;margin:0}h1 small{font:0.72rem/1 ui-monospace,Menlo,monospace;color:var(--dim);
letter-spacing:.14em;text-transform:uppercase;display:block;margin-bottom:.5rem}
.card{background:var(--card);border:1px solid var(--rule);border-radius:4px;padding:1.1rem 1.3rem;margin:1.5rem 0}
.head{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;flex-wrap:wrap}
h2{font:0.72rem/1 ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;
color:var(--dim);margin:0 0 .8rem}
.tag{font:0.7rem/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;
padding:.25rem .5rem;border:1px solid currentColor;border-radius:2px}
.good{color:var(--good)}.warn{color:var(--warn)}.quiet{color:var(--quiet)}
table{border-collapse:collapse;width:100%;font-size:.9rem}
td,th{text-align:left;padding:.4rem .6rem .4rem 0;border-bottom:1px solid var(--rule)}
td:first-child{font-family:ui-monospace,Menlo,monospace;font-size:.85rem}
.n{text-align:right;font-variant-numeric:tabular-nums;color:var(--dim)}
p{margin:.5rem 0 0;color:var(--dim);font-size:.9rem}
nav{margin-top:2rem;font-size:.9rem}nav a{color:inherit;margin-right:1.2rem}
</style>
<h1><small>dungeon-crawler</small>${repoName}</h1>

<div class="card">
  <div class="head"><h2>Direction</h2><span class="tag ${direction.tone}">${direction.label}</span></div>
  <p>${direction.detail}.</p>
  ${t.readable && t.up > t.down ? "<p><b>A raise is not a failure</b> — every one of them carries a written reason, which is the rail working. But a ratchet that has only ever gone one way is a ratchet in name.</p>" : ""}
</div>

<div class="card">
  <h2>Gates — ${lit.length} lit${dark.length ? `, ${dark.length} unlit` : ""}</h2>
  <table><thead><tr><th>gate</th><th class="n">budget</th><th class="n">entries</th><th class="n"></th></tr></thead>
  <tbody>${lit.map(row).join("")}</tbody></table>
  ${dark.length ? `<p><b>Unlit is not zero.</b> ${dark.map((g) => g.gate).join(", ")} ${dark.length === 1 ? "has" : "have"} never been frozen — that is unmeasured, not clean.</p>` : ""}
</div>

<nav><a href="/history">History →</a><a href="/map">Map →</a><a href="/city">City →</a></nav>
<p>Nothing here describes a person. This describes the code.</p>`;
}

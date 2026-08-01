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
import { NAV, card, chip, page, tile } from "./shell.mjs";

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
    `<tr><td class="name">${g.gate}</td><td class="n">${g.budget ?? "&mdash;"}</td>` +
    `<td class="n">${g.entries || "&mdash;"}</td>` +
    `<td class="n">${g.justified ? `${g.justified} justified` : ""}</td></tr>`;

  // SUMMARY BEFORE DETAIL. A tool is scanned, not read top to bottom, so the three facts that decide
  // whether you need to look further go first — and "unlit" is one of them, because a repository with
  // two dimensions it cannot see is in a different state from one that is clean.
  const tiles = [
    tile("Gates lit", `${lit.length}<span class="n">/${gates.length}</span>`, {
      tone: dark.length ? "warn" : "good",
      note: dark.length ? `${dark.length} never frozen` : "every dimension measured",
    }),
    tile("Direction", direction.label, { tone: direction.tone, note: `${t.records} ledger record${t.records === 1 ? "" : "s"}` }),
    tile("Justified raises", lit.reduce((n, g) => n + (g.justified ?? 0), 0), {
      note: "each one carries a written reason",
    }),
  ].join("");

  const doors = NAV.filter((v) => v.path !== "/")
    .map((v) => `<a class="door" href="${v.path}"><b>${v.label}</b><span>${v.blurb}</span><span class="path">${v.path}</span></a>`)
    .join("");

  const body = `
<div class="tiles">${tiles}</div>

${card(
  "Direction",
  `<p>${direction.detail}.</p>${
    t.readable && t.up > t.down
      ? "<p><b>A raise is not a failure</b> — every one of them carries a written reason, which is the rail working. But a ratchet that has only ever gone one way is a ratchet in name.</p>"
      : ""
  }`,
  chip(direction.tone, direction.label),
)}

${card(
  `Gates &mdash; ${lit.length} lit${dark.length ? `, ${dark.length} unlit` : ""}`,
  `<div class="scroll"><table>
    <thead><tr><th>gate</th><th class="n">budget</th><th class="n">entries</th><th class="n">raises</th></tr></thead>
    <tbody>${lit.map(row).join("")}</tbody>
  </table></div>` +
    (dark.length
      ? `<p><b>Unlit is not zero.</b> ${dark.map((g) => g.gate).join(", ")} ${
          dark.length === 1 ? "has" : "have"
        } never been frozen — that is unmeasured, not clean.</p>`
      : ""),
)}

${card("Views", `<div class="doors">${doors}</div>`)}`;

  return page({
    title: `${repoName} — overview`,
    repoName,
    // The eyebrow says WHERE YOU ARE, not what this repository is called. It used to be the literal
    // string "dungeon-crawler", which meant an adopter's own overview announced this project's name
    // above theirs — a project-specific value that rode along in the lift, exactly the class of
    // defect the portability suite exists to catch.
    eyebrow: "Overview",
    blurb: "What this repository's own instruments say, assembled from six gates that each answer honestly and separately.",
    here: "/",
    body,
  });
}

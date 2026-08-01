// CARTOGRAPHY — render the dungeon map as a standalone HTML page.
//
// The reframe this implements: **the dungeon is a theming of the ADR process.** An ADR is what a
// cleared room *is* — the durable record of a fight already won. That is not decoration; it fixes a
// real, well-known weakness of the ADR practice.
//
// ADRs are famously DISCONNECTED: a numbered list of unrelated decisions with no narrative and no
// spatial sense. `ADR-0007: Use Postgres` tells you nothing about what it unlocked or what it made
// unreachable. A map gives them structure — which room led where, what territory each one covers,
// what is still dark — so the accumulated history reads as a route rather than a filing cabinet.
//
// Everything rendered is derived: rooms come from docs/adr, bosses from committed budgets, fog from
// dimensions the repo cannot measure. Nothing is invented, so the map cannot flatter the repository.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { bossList, unlitDimensions } from "./state.mjs";

/** Parse the ADR front-matter every template in this harness writes. */
function rooms(root) {
  const dir = join(root, "docs/adr");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^\d{4}-/.test(f) && f.endsWith(".md") && !f.startsWith("0000"))
    .sort()
    .map((file) => {
      const body = readFileSync(join(dir, file), "utf8");
      const title = (body.match(/^#\s*ADR-\d+:\s*(.+)$/m) ?? [, file.replace(/\.md$/, "")])[1].trim();
      const status = (body.match(/\*\*Status:\*\*\s*([^\n<]+)/) ?? [, "Unknown"])[1].trim();
      const date = (body.match(/\*\*Date:\*\*\s*([^\n]+)/) ?? [, ""])[1].trim();
      const superseded = /Superseded/i.test(status);
      return { id: file.slice(0, 4), file, title, status, date, superseded };
    });
}

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function mapHtml(root, repoName) {
  const cleared = rooms(root);
  const ahead = bossList(root).slice(0, 6);
  const dark = unlitDimensions(root).map((d) => d.label);
  const name = repoName ?? root.split("/").pop();

  // Rooms are laid out serpentine — left-to-right, then down and back — so the route reads as a path
  // walked rather than a list rendered. Position encodes order, which a numbered list throws away.
  const COLS = 4;
  const cell = 168;
  const rowH = 132;
  const rowsCount = Math.max(1, Math.ceil(cleared.length / COLS));
  const w = COLS * cell + 40;
  const h = rowsCount * rowH + 60;

  const pos = cleared.map((r, i) => {
    const row = Math.floor(i / COLS);
    const col = row % 2 === 0 ? i % COLS : COLS - 1 - (i % COLS);
    return { ...r, x: 20 + col * cell + cell / 2, y: 30 + row * rowH + 40 };
  });

  const corridors = pos
    .slice(1)
    .map((r, i) => {
      const a = pos[i];
      return `<path d="M ${a.x} ${a.y} C ${a.x} ${(a.y + r.y) / 2}, ${r.x} ${(a.y + r.y) / 2}, ${r.x} ${r.y}"
        fill="none" stroke="var(--border)" stroke-width="2" stroke-linecap="round"/>`;
    })
    .join("\n");

  const roomNodes = pos
    .map(
      (r) => `
    <g class="room${r.superseded ? " superseded" : ""}">
      <rect x="${r.x - 62}" y="${r.y - 24}" width="124" height="48" rx="4"/>
      <text class="rid" x="${r.x}" y="${r.y - 6}" text-anchor="middle">ADR-${esc(r.id)}</text>
      <text class="rtitle" x="${r.x}" y="${r.y + 12}" text-anchor="middle">${esc(
        r.title.length > 20 ? `${r.title.slice(0, 19)}…` : r.title,
      )}</text>
      <title>ADR-${esc(r.id)} — ${esc(r.title)}  ·  ${esc(r.status)}${r.date ? `  ·  ${esc(r.date)}` : ""}</title>
    </g>`,
    )
    .join("\n");

  return `<title>Dungeon map — ${esc(name)}</title>
<style>
  :root{--bg:#0B0F14;--surface:#131A22;--surface-2:#0F151C;--border:#223041;--text:#E6EDF3;
        --muted:#8B9AAB;--accent:#35D0BA;--ember:#FF9E3D;--neg:#F85149;
        --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
        --mono:ui-monospace,"JetBrains Mono","SF Mono",Menlo,Consolas,monospace;}
  @media (prefers-color-scheme:light){:root{--bg:#F7F9FB;--surface:#FFFFFF;--surface-2:#F0F4F8;
        --border:#DCE3EA;--text:#0B0F14;--muted:#5A6B7B;--accent:#0E9F8C;--ember:#C2620E;--neg:#CF222E;}}
  :root[data-theme="light"]{--bg:#F7F9FB;--surface:#FFFFFF;--surface-2:#F0F4F8;--border:#DCE3EA;
        --text:#0B0F14;--muted:#5A6B7B;--accent:#0E9F8C;--ember:#C2620E;--neg:#CF222E;}
  :root[data-theme="dark"]{--bg:#0B0F14;--surface:#131A22;--surface-2:#0F151C;--border:#223041;
        --text:#E6EDF3;--muted:#8B9AAB;--accent:#35D0BA;--ember:#FF9E3D;--neg:#F85149;}
  body{background:var(--bg);color:var(--text);font-family:var(--sans);}
  .wrap{max-width:940px;margin:0 auto;padding:36px 22px 64px;}
  .eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);}
  h1{font-size:clamp(24px,4vw,34px);letter-spacing:-.02em;margin:9px 0 10px;}
  .lede{color:var(--muted);max-width:64ch;line-height:1.65;font-size:14.5px;margin:0;}
  .stats{display:flex;flex-wrap:wrap;gap:26px;margin:24px 0 6px;}
  .k{font-family:var(--mono);font-size:24px;font-variant-numeric:tabular-nums;}
  .l{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-top:3px;}
  h2{font-family:var(--mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);
     font-weight:500;margin:30px 0 12px;}
  .stage{background:var(--surface-2);border:1px solid var(--border);border-radius:5px;padding:8px;overflow-x:auto;}
  svg{display:block;min-width:${w}px;}
  .room rect{fill:var(--surface);stroke:var(--accent);stroke-width:1.5;}
  .room .rid{font-family:var(--mono);font-size:10px;fill:var(--accent);letter-spacing:.08em;}
  .room .rtitle{font-family:var(--sans);font-size:11px;fill:var(--muted);}
  .room.superseded rect{stroke:var(--border);stroke-dasharray:4 3;}
  .room.superseded .rid{fill:var(--muted);}
  .row{display:flex;gap:10px;align-items:baseline;padding:9px 12px;background:var(--surface);
       border:1px solid var(--border);border-left:2px solid var(--neg);border-radius:0 3px 3px 0;margin-bottom:7px;}
  .row .n{font-family:var(--mono);font-size:12.5px;color:var(--text);}
  .row .d{color:var(--muted);font-size:12.5px;flex:1;}
  .row .s{font-family:var(--mono);font-size:11.5px;color:var(--ember);font-variant-numeric:tabular-nums;}
  .fog{display:flex;flex-wrap:wrap;gap:8px;}
  .fog span{font-family:var(--mono);font-size:11px;color:var(--muted);background:var(--surface-2);
            border:1px dashed var(--border);border-radius:3px;padding:5px 9px;}
  .note{margin-top:28px;color:var(--muted);font-size:13px;line-height:1.65;max-width:66ch;}
  .note strong{color:var(--text);}
</style>
<div class="wrap">
  <div class="eyebrow">${esc(name)} · dungeon map</div>
  <h1>The route so far</h1>
  <p class="lede">Every room is an architecture decision already made. The corridors are the order they
    were made in — which is the thing a numbered list of ADRs throws away.</p>

  <div class="stats">
    <div><div class="k" style="color:var(--accent)">${cleared.length}</div><div class="l">rooms cleared</div></div>
    <div><div class="k" style="color:var(--ember)">${ahead.length}</div><div class="l">bosses standing</div></div>
    <div><div class="k" style="color:var(--muted)">${dark.length}</div><div class="l">unlit</div></div>
  </div>

  <h2>Cleared — docs/adr</h2>
  <div class="stage">
    <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"
         aria-label="Dungeon map of ${esc(String(cleared.length))} cleared rooms">
      ${corridors}
      ${roomNodes || `<text x="20" y="40" class="rtitle" fill="var(--muted)">no ADRs — the route taken was never written down</text>`}
    </svg>
  </div>

  <h2>Bosses still standing</h2>
  ${
    ahead.length
      ? ahead
          .map(
            (b) =>
              `<div class="row"><span class="n">☠ ${esc(b.label)}</span><span class="d">${esc(
                b.detail,
              )}</span><span class="s">${esc(b.stat)}</span></div>`,
          )
          .join("\n")
      : `<p class="lede">None visible — either the dungeon is clean, or the debt is not yet frozen.</p>`
  }

  <h2>Unlit — what this repository cannot see</h2>
  ${
    dark.length
      ? `<div class="fog">${dark.map((d) => `<span>${esc(d)}</span>`).join("")}</div>`
      : `<p class="lede">Every dimension is measured.</p>`
  }

  <p class="note"><strong>Why this exists.</strong> ADRs are famously disconnected — a numbered list
    with no narrative, where <em>ADR-0007: Use Postgres</em> tells you nothing about what it unlocked or
    what it closed off. Giving the decisions a map turns accumulated history into a route, and makes
    the concept graspable without a tutorial: a cleared room is a fight you already won, and the ADR is
    the record of how. Nothing here is invented — rooms come from <code>docs/adr</code>, bosses from
    committed budgets, and unlit regions are dimensions the repo genuinely cannot measure yet.</p>
</div>`;
}

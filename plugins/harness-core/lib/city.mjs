// THE CITY — rung two of the visual ladder: the repository as an isometric town.
//
// Rung one (`harness-map`) answers *what have we decided, and what still stands?* This answers a
// different question that prose is genuinely bad at: **where is the weight, and where is the risk?**
// A list of thirty files sorted by line count is thirty facts you have to hold. A skyline is one
// image: the tall things are tall, the districts are visibly uneven, and a red tower is somewhere
// specific rather than somewhere on page two.
//
// It is a VIEW, not a measurement — every number comes from `model.mjs`, which reads committed state.
// Nothing here decides what a big file is. That separation is the whole reason the ladder can grow a
// 3D rung later without the two renderings quietly disagreeing.
//
// Self-contained by construction: inline SVG, inline CSS, no script, no font, no image. It opens from
// disk, survives being emailed, and renders under a strict CSP — the same promise the map makes.
import { repoModel, totalsOf } from "./model.mjs";
import { esc } from "./render.mjs";

const TILE_W = 54; // isometric tile width in px
const TILE_H = 27; // …and its height. 2:1 is the classic isometric ratio.
const MAX_H = 210; // tallest a building may DRAW; the true line count still travels with it
const MIN_H = 16; // …and the shortest, so a small file is still a building and not a paving slab
const PER_ROW = 5; // buildings per district row, so a district reads as a city block
const FLOOR = 14; // pixels per lit floor — the window bands that make a box read as a building

/** Isometric projection: grid (gx, gy) → screen (x, y). The one piece of maths in the file. */
const iso = (gx, gy) => ({ x: (gx - gy) * (TILE_W / 2), y: (gx + gy) * (TILE_H / 2) });

/**
 * Window bands down the two visible faces — the cheapest thing that turns a box into a BUILDING.
 *
 * Not decoration for its own sake: a plain extruded cube gives the eye no sense of scale, so a
 * 200-line file and a 40-line file read as "two boxes" rather than "a tower and a cottage". Floors
 * give the height a unit, which is the entire job of this rung.
 */
function windows(x, y, h, hw, hh) {
  const floors = Math.max(1, Math.floor(h / FLOOR) - 1);
  const out = [];
  for (let f = 1; f <= floors; f++) {
    const dy = h - f * FLOOR;
    // Two bands per floor, one on each visible face, inset from the corners.
    out.push(`<path class="win" d="M ${x - hw * 0.62} ${y + hh * 0.62 - dy} L ${x - hw * 0.14} ${y + TILE_H * 0.86 - dy} L ${x - hw * 0.14} ${y + TILE_H * 0.86 - dy + 5} L ${x - hw * 0.62} ${y + hh * 0.62 - dy + 5} Z"/>`);
    out.push(`<path class="win r" d="M ${x + hw * 0.62} ${y + hh * 0.62 - dy} L ${x + hw * 0.14} ${y + TILE_H * 0.86 - dy} L ${x + hw * 0.14} ${y + TILE_H * 0.86 - dy + 5} L ${x + hw * 0.62} ${y + hh * 0.62 - dy + 5} Z"/>`);
  }
  return out.join("");
}

/**
 * One building as three faces: top, left, right — plus its lit floors.
 *
 * Drawn back-to-front by the caller's ordering rather than with z-indexing, which is what an
 * isometric scene needs and what makes this portable to a real 3D rung later — the geometry is
 * already expressed as a grid position plus a height.
 */
function building(gx, gy, h, cls, title) {
  const { x, y } = iso(gx, gy);
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  return `<g class="b ${cls}"><title>${esc(title)}</title>
    <path class="left" d="M ${x - hw} ${y + hh - h} L ${x} ${y + TILE_H - h} L ${x} ${y + TILE_H} L ${x - hw} ${y + hh} Z"/>
    <path class="right" d="M ${x + hw} ${y + hh - h} L ${x} ${y + TILE_H - h} L ${x} ${y + TILE_H} L ${x + hw} ${y + hh} Z"/>
    ${windows(x, y, h, hw, hh)}
    <path class="top" d="M ${x} ${y - h} L ${x + hw} ${y + hh - h} L ${x} ${y + TILE_H - h} L ${x - hw} ${y + hh - h} Z"/>
  </g>`;
}

/**
 * Height in pixels for a file — SQUARE-ROOT scaled, deliberately.
 *
 * Linear scaling against the tallest building crushed everything else: with one 200-line module in
 * the city, a 60-line file drew at 30% and a 40-line file at 20%, so two thirds of the skyline was
 * an indistinguishable low plate. A square root spreads the middle of the range where most files
 * actually live, which is where the eye needs to be able to tell things apart. The ordering is
 * preserved exactly — taller is still bigger — and the true line count is in the tooltip.
 */
const heightOf = (lines, tallest) =>
  Math.round(MIN_H + Math.sqrt(lines / Math.max(tallest, 1)) * (MAX_H - MIN_H));

/** The ground a district stands on, so its buildings read as a block rather than as floating boxes. */
function ground(gx, gy, cols, rows) {
  const a = iso(gx - 0.5, gy - 0.5);
  const b = iso(gx + cols - 0.5, gy - 0.5);
  const c = iso(gx + cols - 0.5, gy + rows - 0.5);
  const d = iso(gx - 0.5, gy + rows - 0.5);
  return `<path class="ground" d="M ${a.x} ${a.y + TILE_H} L ${b.x} ${b.y + TILE_H} L ${c.x} ${c.y + TILE_H} L ${d.x} ${d.y + TILE_H} Z"/>`;
}

/**
 * Lay the districts out as one connected city rather than a stack of islands.
 *
 * Districts march along the +gx axis, each occupying `cols × PER_ROW` tiles with a one-tile street
 * between them. The first attempt offset each district on BOTH axes, which pushed them apart into
 * separate floating plates with a diagonal void between — technically a layout, visually two
 * unrelated pictures. A city has to read as one place, or the comparison the whole rung exists for
 * (this district is heavier than that one) never happens.
 */
function scene(model) {
  const tallest = Math.max(1, ...model.districts.flatMap((d) => d.buildings.map((b) => b.lines)));
  const grounds = [];
  const parts = [];
  const labels = [];
  let cursor = 0;

  for (const district of model.districts) {
    const cols = Math.ceil(district.buildings.length / PER_ROW);
    const rows = Math.min(PER_ROW, district.buildings.length);
    grounds.push(ground(cursor, 0, cols, rows));

    district.buildings.forEach((b, i) => {
      const gx = cursor + Math.floor(i / PER_ROW);
      const gy = i % PER_ROW;
      parts.push({
        gx,
        gy,
        svg: building(gx, gy, heightOf(b.lines, tallest), b.state, `${b.path} — ${b.lines} lines (budget ${b.cap})`),
      });
    });

    // The plaque sits at the district's NEAR corner, on the ground, below every building — the first
    // version centred it on the block and it was drawn straight through the skyline.
    // Plaques go on ONE baseline below the whole scene, at each district's centre x. Anchoring each
    // to its own near corner put the first district's label inside the second district's footprint —
    // correct per-district, unreadable as a picture. A shared baseline is also how a real map legend
    // reads: same line, one glance, no hunting.
    const centre = iso((cursor + cursor + cols - 1) / 2, (rows - 1) / 2);
    labels.push({ x: centre.x, near: iso(cursor + cols - 1, rows - 1).y, district });
    cursor += cols + 2; // two tiles of street, so districts read as separate blocks
  }

  // Back-to-front: smaller (gx + gy) is further away, so it must be drawn first or near buildings
  // will be painted behind far ones. Painter's algorithm, which is all an isometric scene needs.
  parts.sort((a, b) => a.gx + a.gy - (b.gx + b.gy));
  const baseline = Math.max(...labels.map((l) => l.near), 0) + TILE_H * 2.6;
  for (const l of labels) l.y = baseline;
  return { grounds: grounds.join("\n"), buildings: parts.map((p) => p.svg).join("\n"), labels, cursor };
}

/** The city as a complete, standalone HTML document. */
export function cityDocument(root, repoName) {
  const model = repoModel(root);
  const { grounds, buildings, labels, cursor } = scene(model);
  const { files: totalFiles, over } = totalsOf(model.districts);

  // The viewBox is computed from the drawn extent rather than guessed, so a repo of any size fits
  // and neither a one-district project nor a fifty-district monorepo needs a magic number.
  const deepest = Math.min(PER_ROW, Math.max(1, ...model.districts.map((d) => d.buildings.length)));
  // Plaques are centred and can be wider than the block above them, so the extent has to include
  // them — the first version measured the buildings only and clipped the leftmost label mid-word.
  const halfLabel = (l) => l.district.name.length * 3.9;
  const left = Math.min(iso(0, deepest - 1).x, ...labels.map((l) => l.x - halfLabel(l))) - TILE_W * 0.6;
  const right = Math.max(iso(cursor, 0).x, ...labels.map((l) => l.x + halfLabel(l))) + TILE_W * 0.6;
  const bottom = Math.max(...labels.map((l) => l.y), iso(cursor, deepest).y) + TILE_H * 2;
  const vbW = Math.round(right - left);
  const vbH = Math.round(bottom + MAX_H + 40);

  const districtLabels = labels
    .map(
      (l) =>
        `<text class="dist" x="${Math.round(l.x)}" y="${Math.round(l.y)}" text-anchor="middle">${esc(l.district.name)}</text>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>City — ${esc(repoName)}</title>
<style>
  :root{--bg:#0B0F14;--surface:#131A22;--border:#223041;--text:#E6EDF3;--muted:#8B9AAB;
        --accent:#35D0BA;--ember:#FF9E3D;--neg:#F85149;
        --ok-top:#2C6E63;--ok-l:#1C4A44;--ok-r:#14332F;
        --watch-top:#8A5A22;--watch-l:#5E3C16;--watch-r:#40290F;
        --over-top:#A83A33;--over-l:#742722;--over-r:#4F1B17;
        --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
        --mono:ui-monospace,"JetBrains Mono","SF Mono",Menlo,Consolas,monospace;}
  @media (prefers-color-scheme:light){:root{--bg:#F7F9FB;--surface:#FFFFFF;--border:#DCE3EA;
        --text:#0B0F14;--muted:#5A6B7B;--accent:#0E9F8C;--ember:#C2620E;--neg:#CF222E;
        --ok-top:#7BD3C4;--ok-l:#4FA595;--ok-r:#357C70;
        --watch-top:#F2C08A;--watch-l:#D2914F;--watch-r:#A96D33;
        --over-top:#F0A099;--over-l:#D2665C;--over-r:#A8443C;}}
  :root[data-theme="light"]{--bg:#F7F9FB;--surface:#FFFFFF;--border:#DCE3EA;--text:#0B0F14;
        --muted:#5A6B7B;--accent:#0E9F8C;--ember:#C2620E;--neg:#CF222E;
        --ok-top:#7BD3C4;--ok-l:#4FA595;--ok-r:#357C70;
        --watch-top:#F2C08A;--watch-l:#D2914F;--watch-r:#A96D33;
        --over-top:#F0A099;--over-l:#D2665C;--over-r:#A8443C;}
  :root[data-theme="dark"]{--bg:#0B0F14;--surface:#131A22;--border:#223041;--text:#E6EDF3;
        --muted:#8B9AAB;--accent:#35D0BA;--ember:#FF9E3D;--neg:#F85149;
        --ok-top:#2C6E63;--ok-l:#1C4A44;--ok-r:#14332F;
        --watch-top:#8A5A22;--watch-l:#5E3C16;--watch-r:#40290F;
        --over-top:#A83A33;--over-l:#742722;--over-r:#4F1B17;}
  body{background:var(--bg);color:var(--text);font-family:var(--sans);margin:0;}
  .wrap{max-width:1100px;margin:0 auto;padding:36px 22px 64px;}
  .eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;
           color:var(--muted);}
  h1{font-size:28px;margin:6px 0 4px;letter-spacing:-.01em;}
  .lede{color:var(--muted);font-size:14px;line-height:1.6;max-width:70ch;margin:0 0 22px;}
  .figure{background:var(--surface);border:1px solid var(--border);border-radius:10px;
          padding:10px;overflow-x:auto;}
  /* Natural size, never stretched: an SVG scaled to fill a wide container blows the label type up
     with it, and a 13px plaque rendered at 3× reads as a headline sitting on the skyline. */
  svg{display:block;max-width:100%;height:auto;margin:0 auto;}
  .b .top{fill:var(--ok-top);}.b .left{fill:var(--ok-l);}.b .right{fill:var(--ok-r);}
  .b.watch .top{fill:var(--watch-top);}.b.watch .left{fill:var(--watch-l);}.b.watch .right{fill:var(--watch-r);}
  .b.over .top{fill:var(--over-top);}.b.over .left{fill:var(--over-l);}.b.over .right{fill:var(--over-r);}
  .b path{stroke:var(--bg);stroke-width:.75;}
  .b .win{fill:var(--accent);opacity:.30;stroke:none;}
  .b .win.r{opacity:.16;}
  .b.over .win{fill:var(--ember);opacity:.38;}
  .ground{fill:var(--border);opacity:.55;stroke:none;}
  text.dist{fill:var(--text);font-family:var(--mono);font-size:13px;}
  text.dist .dim{fill:var(--muted);}
  .ledger{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px;}
  .ledger th{text-align:left;font-weight:500;color:var(--muted);font-size:11px;letter-spacing:.09em;
             text-transform:uppercase;padding:0 10px 7px 0;border-bottom:1px solid var(--border);}
  .ledger td{padding:8px 10px 8px 0;border-bottom:1px solid var(--border);color:var(--muted);}
  .ledger td.n{color:var(--text);font-family:var(--mono);}
  .ledger td.q{font-family:var(--mono);font-size:12px;}
  .ledger td.bad{color:var(--neg);font-weight:600;}
  .ledger .dim{color:var(--muted);opacity:.7;}
  .key{display:flex;gap:18px;flex-wrap:wrap;margin:16px 0 0;font-size:13px;color:var(--muted);}
  .key b{color:var(--text);font-weight:600;}
  .sw{display:inline-block;width:11px;height:11px;border-radius:2px;vertical-align:-1px;margin-right:6px;}
  .fog{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px;}
  .fog span{font-family:var(--mono);font-size:12px;color:var(--muted);
            border:1px dashed var(--border);border-radius:3px;padding:5px 9px;}
  .note{margin-top:26px;color:var(--muted);font-size:13px;line-height:1.65;max-width:68ch;}
  .note strong{color:var(--text);}
</style>
</head>
<body>
<div class="wrap">
  <div class="eyebrow">${esc(repoName)} · city</div>
  <h1>Where the weight is</h1>
  <p class="lede">${totalFiles} source file${totalFiles === 1 ? "" : "s"} across ${model.districts.length} district${model.districts.length === 1 ? "" : "s"}.
    Every building is a file, its height is its line count, and its colour is its standing against the
    committed budget. ${over > 0 ? `<strong>${over}</strong> ${over === 1 ? "building is" : "buildings are"} over budget.` : "Nothing is over budget."}</p>

  <div class="figure">
    <svg width="${vbW}" height="${vbH}"
         viewBox="${Math.round(left)} ${Math.round(-MAX_H - 24)} ${vbW} ${vbH}" role="img"
         aria-label="Isometric view of ${esc(repoName)}: ${totalFiles} files in ${model.districts.length} districts, ${over} over budget">
${grounds}
${buildings}
${districtLabels}
    </svg>
  </div>

  <table class="ledger">
    <thead><tr><th>district</th><th>files</th><th>lines</th><th>tallest</th><th>over budget</th></tr></thead>
    <tbody>
${model.districts
  .map(
    (d) =>
      `      <tr><td class="n">${esc(d.name)}</td><td>${d.buildings.length}</td><td>${d.lines.toLocaleString()}</td><td class="q">${esc(d.buildings[0]?.name ?? "—")} <span class="dim">${d.buildings[0]?.lines ?? 0}</span></td><td class="${d.over ? "bad" : ""}">${d.over || "—"}</td></tr>`,
  )
  .join("\n")}
    </tbody>
  </table>

  <div class="key">
    <span><i class="sw" style="background:var(--ok-top)"></i>within budget</span>
    <span><i class="sw" style="background:var(--watch-top)"></i>large, still within budget</span>
    <span><i class="sw" style="background:var(--over-top)"></i><b>over budget</b></span>
    <span>height = lines · hover a building for its path</span>
  </div>

  ${
    model.unlit.length
      ? `<div class="fog">${model.unlit.map((d) => `<span>unlit: ${esc(d.label)}</span>`).join("")}</div>`
      : ""
  }

  <p class="note"><strong>This is a view, not a measurement.</strong> Every number comes from the same
    derived model the dungeon map reads — file sizes on disk and the committed budgets — so the two
    renderings cannot disagree. A dimension this repository cannot measure is drawn as
    <em>unlit</em> rather than as zero: a city with no dark quarters would be a lie, and the one thing
    a picture must never do is flatter the codebase it is a picture of.</p>
</div>
</body>
</html>
`;
}

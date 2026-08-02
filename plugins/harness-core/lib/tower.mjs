// THE TOWER — rung three of the visual ladder: the repository as a watchtower, in real 3D.
//
// Each rung answers a question prose is genuinely bad at, and it has to be a DIFFERENT question or
// the rung is decoration with a new camera angle:
//
//   rung one   `harness-map`     what have we decided, and what still stands?
//   rung two   `harness-city`    where is the weight, and where is the risk?
//   rung three `harness-tower`   WHAT IS WATCHING, and how much of this can it see?
//
// Coverage is the thing the first two rungs cannot show. The city draws every file it can find, and
// a repository whose duplication gate has never been frozen draws exactly the same city as one where
// every dimension is measured — the absence is invisible precisely because it is an absence. Here it
// is the loudest thing in the frame: the Eye at the summit opens in proportion to how many of the six
// dimensions are lit, and its beam reaches down the tower only as far as that fraction. A repository
// measuring two of six gets a half-lidded Eye over a tower that is mostly in the dark, which is an
// accurate portrait and an uncomfortable one.
//
// A VIEW, NEVER A SOURCE OF TRUTH. Every number comes from `model.mjs`. What a "big file" is, which
// districts exist, which dimensions are lit — all decided there, so this rung and the two below it
// cannot disagree about the repository. The geometry is this file's own; the conclusions are not.
//
// Self-contained by construction, same promise as the rungs below: inline SVG, inline CSS, no script,
// no font, no image. It opens from disk, survives being emailed, and renders under a strict CSP.
import { repoModel, totalsOf } from "./model.mjs";
import { esc } from "./render.mjs";
import { drum, faceNormal, facingCamera, makeCamera, paintOrder, quadPoint, ringPoints, shadeFace, svgFace, v3add, v3scale } from "./solid.mjs";

const SIDES = 14; // facets per drum — enough to read as round, few enough to stay a readable file
const MAX_R = 104; // the widest a tier may DRAW; the true line count travels with it in the ledger
const MIN_R = 34; // …and the narrowest, so a small district is still a tier and not a washer
const TIER_MIN_H = 54;
const TIER_MAX_H = 156;
const PLINTH_H = 26; // the foundation the tower stands on, so it does not float
const CROWN_H = 74; // the drum the Eye sits on
const STOREY = 21; // world units per window band — what gives a tier's height a unit
const MERLON_H = 13; // battlement height on an exposed ledge
const LIGHT = [-0.55, 0.66, 0.5]; // sun over the viewer's left shoulder
const SKIN = 0.6; // how far a window slot stands proud of its wall, in world units

/**
 * Tier radius — SQUARE-ROOT scaled, for the reason the city learned the expensive way.
 *
 * Linear scaling against the heaviest district crushed everything else into an indistinguishable
 * stack: with one district holding two thirds of the lines, every other tier drew at the minimum and
 * the taper — the entire signal — disappeared. A square root spreads the middle of the range, where
 * districts actually live. Ordering is preserved exactly, and the true totals are in the ledger.
 */
const radiusOf = (lines, heaviest) => MIN_R + Math.sqrt(lines / Math.max(heaviest, 1)) * (MAX_R - MIN_R);

/** Tier height, by file count. A district of many small files is a tall storey, not a wide one. */
const heightOfTier = (files, most) => TIER_MIN_H + Math.sqrt(files / Math.max(most, 1)) * (TIER_MAX_H - TIER_MIN_H);

/**
 * A tier's standing is the WORST standing of the files in it, and it is read from the model rather
 * than recomputed here.
 *
 * Worst-of and not a proportion, deliberately: a district with one file over budget and forty within
 * it is a district with a file over budget. Averaging would let a single breach be diluted into a
 * pleasant colour by the size of the district around it — which is the picture flattering the
 * codebase, the one thing the ladder's founding rule forbids.
 */
const tierState = (buildings) =>
  buildings.some((b) => b.state === "over") ? "over" : buildings.some((b) => b.state === "watch") ? "watch" : "ok";

/**
 * Districts as a stack of tiers, heaviest at the base.
 *
 * The model already sorts districts by weight, and stacking in that order is what makes the tower
 * taper without anybody imposing a taper: a structure whose widest mass is at the bottom is the only
 * arrangement that reads as standing rather than balancing. It also means the silhouette carries
 * information — a tower that barely narrows is a repository whose weight is evenly spread.
 */
export function tierPlan(model) {
  const heaviest = Math.max(1, ...model.districts.map((d) => d.lines));
  const most = Math.max(1, ...model.districts.map((d) => d.buildings.length));
  let y = PLINTH_H;

  return model.districts.map((district) => {
    const height = heightOfTier(district.buildings.length, most);
    const tier = {
      district,
      state: tierState(district.buildings),
      lower: radiusOf(district.lines, heaviest),
      y0: y,
      y1: y + height,
    };
    y += height;
    return tier;
  });
}

/**
 * Window slots down one wall, inset from its edges — what turns a drum into a storey of a building.
 *
 * Lifted off the wall by `SKIN`, along the wall's own normal, and that is not cosmetic. A slot drawn
 * exactly on the wall plane has a centroid at the same depth as the wall, so which one the painter's
 * sort puts on top depends on floating-point noise: the windows flicker in and out between two
 * repositories that differ only in a tier's radius. Standing them proud of the surface makes the
 * ordering a fact about the geometry rather than a coin toss.
 */
function slotsOn(quad, worldHeight, cls) {
  const bands = Math.max(1, Math.floor(worldHeight / STOREY) - 1);
  const lift = v3scale(faceNormal(quad), SKIN);
  const at = (u, v) => v3add(quadPoint(quad, u, v), lift);
  const out = [];
  for (let i = 1; i <= bands; i++) {
    const v = i / (bands + 1);
    const h = Math.min(0.11, 0.5 / (bands + 1));
    out.push({
      kind: "glow",
      cls: `slot ${cls}`,
      points: [at(0.32, v - h), at(0.68, v - h), at(0.68, v + h), at(0.32, v + h)],
    });
  }
  return out;
}

/**
 * Battlements around an exposed ledge — the merlons that make a drum read as a fortification.
 *
 * Purely a silhouette element, and the only one in this file: it carries no number and changes no
 * conclusion. It earns its place the same way the city's window bands did — without it a stack of
 * tapering drums reads as tableware, and a viewer who is busy deciding what the picture *is* has not
 * started reading what it says.
 */
function merlonsAround(radius, y, phase) {
  const inner = radius * 0.84;
  const out = [];
  for (let i = 0; i < SIDES; i += 2) {
    const a = phase + (i / SIDES) * Math.PI * 2;
    const b = phase + ((i + 1) / SIDES) * Math.PI * 2;
    const foot = [
      [Math.cos(a) * radius, y, Math.sin(a) * radius],
      [Math.cos(b) * radius, y, Math.sin(b) * radius],
      [Math.cos(b) * inner, y, Math.sin(b) * inner],
      [Math.cos(a) * inner, y, Math.sin(a) * inner],
    ];
    const head = foot.map((p) => [p[0], y + MERLON_H, p[2]]);
    const { sides, cap } = drum(foot, head);
    for (const quad of sides) out.push({ kind: "solid", cls: "crown", points: quad });
    out.push({ kind: "solid", cls: "crown", points: cap });
  }
  return out;
}

/**
 * The whole solid: plinth, one drum per tier, and the crown the Eye stands on.
 *
 * A tier's cap is drawn only when something narrower sits on it — an exposed ledge is real geometry
 * and reads as a battlement, while a cap under a drum of the same width is a hidden face that costs
 * polygons and can z-fight with the drum above it.
 */
export function towerSolid(plan) {
  const axis = [0, 0, 0];
  const faces = [];
  const top = plan.at(-1);
  const crownR = Math.max(MIN_R * 0.62, (top ? top.lower : MIN_R) * 0.52);
  const apexY = (top ? top.y1 : PLINTH_H) + CROWN_H;

  const push = (radius, y0, y1, cls, { cap = true, slots = null, battlements = false } = {}) => {
    const { sides, cap: lid } = drum(ringPoints(axis, radius, y0, SIDES), ringPoints(axis, radius, y1, SIDES));
    for (const quad of sides) {
      faces.push({ kind: "solid", cls, points: quad });
      if (slots) faces.push(...slotsOn(quad, slots.height, slots.cls));
    }
    if (cap) faces.push({ kind: "solid", cls: `${cls} lid`, points: lid });
    if (battlements) faces.push(...merlonsAround(radius, y1, 0));
  };

  // The plinth. Wider than the tier above it on purpose: a tower drawn flush to the ground has no
  // visible footing and reads as a cylinder pasted onto the page.
  push((plan[0]?.lower ?? MIN_R) * 1.18, 0, PLINTH_H, "plinth");

  plan.forEach((tier, i) => {
    const upperR = plan[i + 1] ? plan[i + 1].lower : crownR;
    const exposed = upperR < tier.lower;
    push(tier.lower, tier.y0, tier.y1, `tier ${tier.state}`, {
      cap: exposed,
      battlements: exposed,
      slots: { height: tier.y1 - tier.y0, cls: tier.state },
    });
  });

  push(crownR, top ? top.y1 : PLINTH_H, apexY, "crown", { battlements: true });

  return { faces, apexY: apexY + MERLON_H, crownR, height: apexY + MERLON_H };
}

/**
 * The Eye — measurement coverage, drawn as an aperture.
 *
 * `lit / total` becomes the lid opening, and that is the entire mapping. It is not a mood: a
 * repository that measures one dimension of six draws a slit, one that measures all six draws a
 * circle, and nothing in between is chosen by taste. The floor of 0.16 exists because a lid closed
 * to literally nothing is indistinguishable from a rendering bug, and "this tower has no Eye" is a
 * different claim from "this Eye sees almost nothing".
 *
 * Drawn in SCREEN space from a projected world point, rather than as 3D geometry. An eye modelled as
 * a solid is a lens shape that has to be turned to face the camera to be legible at all — at which
 * point it is a billboard with extra steps, and the extra steps are where it goes subtly wrong.
 */
function eyeMarkup(centreScreen, halfWidth, coverage) {
  const open = 0.16 + 0.84 * coverage;
  const rx = halfWidth;
  const ry = rx * 0.62 * open;
  const { x, y } = centreScreen;
  const r = (n) => Math.round(n * 10) / 10;

  // The almond: two quadratic arcs meeting at the canthi. A pair of circular arcs would give a
  // lens with equal lids, which reads as a leaf rather than an eye.
  const lens = `M ${r(x - rx)} ${r(y)} Q ${r(x)} ${r(y - ry * 2)} ${r(x + rx)} ${r(y)} Q ${r(x)} ${r(y + ry * 2)} ${r(x - rx)} ${r(y)} Z`;
  const irisR = Math.min(ry * 1.35, rx * 0.42);

  return `<g class="eye">
      <path class="sclera" d="${lens}"/>
      <circle class="iris" cx="${r(x)}" cy="${r(y)}" r="${r(irisR)}"/>
      <ellipse class="pupil" cx="${r(x)}" cy="${r(y)}" rx="${r(Math.max(1.5, irisR * 0.2))}" ry="${r(irisR * 0.86)}"/>
      <path class="lid" d="${lens}"/>
    </g>`;
}

/**
 * The beam, reaching down the tower as far as coverage reaches.
 *
 * The one element that says how much of the structure is under observation rather than how much is
 * being looked at from the top. Where it stops is where the measured part of this repository stops,
 * and the tower below that line is drawn in the same stone as the tower above it — unmeasured is not
 * broken, it is unknown, and rendering it as damage would be its own kind of lie.
 *
 * Drawn IN FRONT of the solid, which the first render got wrong. Behind it, the beam was occluded by
 * the very thing it is measuring — a tower is opaque and narrower than the spread, so at full
 * coverage the page claimed a beam reaching all the way down and showed none at all. The element
 * that reports coverage is the last one that can afford to be invisible.
 */
function beamMarkup(centreScreen, baseScreen, halfWidth, coverage) {
  const { x, y } = centreScreen;
  const reach = y + (baseScreen - y) * coverage;
  const spread = halfWidth * 2.6;
  const r = (n) => Math.round(n * 10) / 10;
  return `<defs><linearGradient id="beamfall" x1="0" y1="0" x2="0" y2="1">
      <stop class="near" offset="0"/><stop class="far" offset="1"/>
    </linearGradient></defs>
    <polygon class="beam" points="${r(x - halfWidth * 0.18)},${r(y)} ${r(x + halfWidth * 0.18)},${r(y)} ${r(x + spread)},${r(reach)} ${r(x - spread)},${r(reach)}"/>`;
}

/** Camera, framing and the projected polygons — everything that depends on where you stand. */
function shot(solid) {
  const H = Math.max(solid.height, 1);
  // Placed relative to the tower's own height rather than at fixed coordinates, so a one-district
  // repository and a fifty-district monorepo are both framed instead of one of them being a speck.
  const camera = makeCamera({
    eye: [H * 0.62, H * 0.92, H * 1.85],
    target: [0, H * 0.44, 0],
    width: 900,
    height: 900,
  });

  const drawn = paintOrder(facingCamera(solid.faces, camera.eye), camera.eye);

  // SHADING AS AN OVERLAY, NOT AS TRANSPARENCY, and this was found by looking at the first render.
  // Lambert as `fill-opacity` on the face itself is one attribute and it is wrong the moment two
  // solids overlap: every wall became a window onto the wall behind it, so a tier read as smoked
  // glass and the stack behind it showed through. It survives a flat background and fails against
  // the actual scene. So each face is painted OPAQUE in its own stone, then darkened by a second
  // polygon of the void colour at `1 − lambert`. Two polygons, correct compositing, and the fill
  // still comes from a CSS variable so the page keeps answering to `prefers-color-scheme`.
  const body = drawn
    .map((f) => {
      if (f.kind === "glow") return svgFace(f.points, camera, ` class="${f.cls}"`);
      const dark = Math.round((1 - shadeFace(f.points, LIGHT)) * 1000) / 1000;
      return `${svgFace(f.points, camera, ` class="${f.cls}"`)}${svgFace(f.points, camera, ` class="shade" fill-opacity="${dark}"`)}`;
    })
    .join("\n");

  return { camera, body, drawn };
}

/** The tower as a complete, standalone HTML document. */
export function towerDocument(root, repoName) {
  const model = repoModel(root);
  const plan = tierPlan(model);
  const solid = towerSolid(plan);
  const { camera, body, drawn } = shot(solid);

  const lit = model.standing.filter((d) => d.lit);
  const dark = model.standing.filter((d) => !d.lit);
  const coverage = model.standing.length ? lit.length / model.standing.length : 0;

  // The Eye is sized from the crown's own PROJECTED width rather than from a pixel constant, so it
  // stays in proportion to the tower at any height — a fixed size is right for one repository and
  // wrong for the next one, and the failure is a giant eye on a tiny tower.
  const apex = camera.project([0, solid.apexY + solid.crownR * 0.62, 0]);
  const crownEdge = camera.project([solid.crownR, solid.apexY, 0]);
  const axisAtApex = camera.project([0, solid.apexY, 0]);
  const eyeHalf = Math.max(18, Math.abs(crownEdge.x - axisAtApex.x) * 0.95);
  const base = camera.project([0, 0, 0]).y;

  // The viewBox is measured from what was actually drawn, plus the Eye's own extent, rather than
  // guessed. A magic number here is a number that is right for the repository it was tuned against.
  const xs = [];
  const ys = [];
  for (const f of drawn) {
    for (const p of f.points) {
      const s = camera.project(p);
      xs.push(s.x);
      ys.push(s.y);
    }
  }
  xs.push(apex.x - eyeHalf * 1.6, apex.x + eyeHalf * 1.6);
  ys.push(apex.y - eyeHalf * 1.6, base + 12);
  const left = Math.min(...xs) - 24;
  const topY = Math.min(...ys) - 24;
  const vbW = Math.round(Math.max(...xs) - left + 24);
  const vbH = Math.round(Math.max(...ys) - topY + 24);

  const { files: totalFiles, over } = totalsOf(model.districts);
  const empty = model.districts.length === 0;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tower — ${esc(repoName)}</title>
<style>
  :root{--page:#07090D;--panel:#10151D;--edge:#1E2735;--ink:#E8EEF5;--faint:#8494A6;
        --stone:#5E6A7C;--stone-watch:#9A7233;--stone-over:#9C3B33;--plinth:#39424F;
        --ember:#FF8A3D;--gold:#FFC65C;--void:#05070A;--glow:#FF6B2C;}
  @media (prefers-color-scheme:light){:root{--page:#F6F8FB;--panel:#FFFFFF;--edge:#DDE4EC;
        --ink:#0A0D12;--faint:#586878;--stone:#A9B5C4;--stone-watch:#E0B26A;--stone-over:#DE8078;
        --plinth:#8A97A7;--ember:#C75512;--gold:#B07A12;--void:#DCE3EB;--glow:#E2621C;}}
  :root[data-theme="light"]{--page:#F6F8FB;--panel:#FFFFFF;--edge:#DDE4EC;--ink:#0A0D12;
        --faint:#586878;--stone:#A9B5C4;--stone-watch:#E0B26A;--stone-over:#DE8078;
        --plinth:#8A97A7;--ember:#C75512;--gold:#B07A12;--void:#DCE3EB;--glow:#E2621C;}
  :root[data-theme="dark"]{--page:#07090D;--panel:#10151D;--edge:#1E2735;--ink:#E8EEF5;
        --faint:#8494A6;--stone:#5E6A7C;--stone-watch:#9A7233;--stone-over:#9C3B33;
        --plinth:#39424F;--ember:#FF8A3D;--gold:#FFC65C;--void:#05070A;--glow:#FF6B2C;}
  body{background:var(--page);color:var(--ink);margin:0;
       font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}
  .wrap{max-width:1080px;margin:0 auto;padding:36px 22px 64px;}
  .eyebrow{font-family:ui-monospace,"JetBrains Mono","SF Mono",Menlo,Consolas,monospace;
           font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--faint);}
  h1{font-size:28px;margin:6px 0 4px;letter-spacing:-.01em;}
  .lede{color:var(--faint);font-size:14px;line-height:1.6;max-width:70ch;margin:0 0 22px;}
  .lede strong{color:var(--ink);}
  .plate{background:var(--panel);border:1px solid var(--edge);border-radius:10px;padding:8px;
         overflow-x:auto;}
  /* Natural size, never stretched — the rung below learned this by blowing 13px labels up to
     headline size. Here it is the Eye that distorts: a scaled SVG scales its stroke widths too. */
  svg{display:block;max-width:100%;height:auto;margin:0 auto;}
  .tier{fill:var(--stone);}
  .tier.watch{fill:var(--stone-watch);}
  .tier.over{fill:var(--stone-over);}
  .plinth{fill:var(--plinth);}
  .crown{fill:var(--stone);}
  polygon{stroke:var(--void);stroke-width:.6;stroke-linejoin:round;}
  .shade{fill:var(--void);stroke:none;}
  .slot{fill:var(--gold);stroke:none;opacity:.62;}
  .slot.over{fill:var(--ember);opacity:.9;}
  /* A flat wash read as a solid conical ROOF sitting on the tower — the shape was right and the
     material was wrong, and at low coverage that roof was the most prominent object on the page.
     Fading it out along its own length is what makes it read as light instead of masonry. */
  .beam{fill:url(#beamfall);stroke:none;}
  #beamfall .near{stop-color:var(--glow);stop-opacity:.26;}
  #beamfall .far{stop-color:var(--glow);stop-opacity:0;}
  .eye .sclera{fill:var(--gold);}
  .eye .iris{fill:var(--glow);}
  .eye .pupil{fill:var(--void);}
  .eye .lid{fill:none;stroke:var(--ember);stroke-width:2;}
  .rows{width:100%;border-collapse:collapse;margin-top:22px;font-size:13px;}
  .rows th{text-align:left;font-weight:500;color:var(--faint);font-size:11px;letter-spacing:.09em;
           text-transform:uppercase;padding:0 10px 7px 0;border-bottom:1px solid var(--edge);}
  .rows td{padding:8px 10px 8px 0;border-bottom:1px solid var(--edge);color:var(--faint);}
  .rows td.q{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:var(--ink);}
  .rows td.dark{color:var(--ember);font-weight:600;}
  .rows td.breach{color:var(--stone-over);font-weight:600;}
  .key{display:flex;gap:18px;flex-wrap:wrap;margin:16px 0 0;font-size:13px;color:var(--faint);}
  .key b{color:var(--ink);font-weight:600;}
  .sw{display:inline-block;width:11px;height:11px;border-radius:2px;vertical-align:-1px;
      margin-right:6px;}
  .note{margin-top:26px;color:var(--faint);font-size:13px;line-height:1.65;max-width:68ch;}
  .note strong{color:var(--ink);}
</style>
</head>
<body>
<div class="wrap">
  <div class="eyebrow">${esc(repoName)} · tower</div>
  <h1>What is watching</h1>
  <p class="lede">${lit.length} of ${model.standing.length} dimensions are measured, so the Eye is
    ${Math.round(coverage * 100)}% open and its beam reaches ${Math.round(coverage * 100)}% of the way
    down. ${empty ? "There is no source tree here yet, so the tower is a foundation and a crown — which is the honest picture of a repository that has not been built on." : `Below it, ${totalFiles} source file${totalFiles === 1 ? "" : "s"} in ${model.districts.length} tier${model.districts.length === 1 ? "" : "s"}, heaviest at the base.`}
    ${over > 0 ? `<strong>${over}</strong> ${over === 1 ? "file is" : "files are"} over budget, and every tier holding one is drawn in breached stone.` : empty ? "" : "No tier is breached."}</p>

  <div class="plate">
    <svg width="${vbW}" height="${vbH}" viewBox="${Math.round(left)} ${Math.round(topY)} ${vbW} ${vbH}"
         role="img"
         aria-label="A watchtower of ${esc(repoName)}: ${model.districts.length} tiers, ${over} breached, under an Eye ${Math.round(coverage * 100)} percent open for ${lit.length} of ${model.standing.length} measured dimensions">
${body}
${beamMarkup(apex, base, eyeHalf, coverage)}
${eyeMarkup(apex, eyeHalf, coverage)}
    </svg>
  </div>

  <div class="key">
    <span><i class="sw" style="background:var(--stone)"></i>within budget</span>
    <span><i class="sw" style="background:var(--stone-watch)"></i>large, still within budget</span>
    <span><i class="sw" style="background:var(--stone-over)"></i><b>breached — a file over budget</b></span>
    <span>tier width = lines · tier height = files · aperture = dimensions measured</span>
  </div>

  <table class="rows">
    <thead><tr><th>dimension</th><th>watching</th><th>evidence</th><th>if dark, what lights it</th></tr></thead>
    <tbody>
${model.standing
  .map(
    (d) =>
      `      <tr><td class="q">${esc(d.label)}</td><td class="${d.lit ? "" : "dark"}">${d.lit ? "lit" : "UNLIT"}</td><td class="q">${esc(d.evidence)}</td><td>${d.lit ? "—" : esc(d.fix)}</td></tr>`,
  )
  .join("\n")}
    </tbody>
  </table>

  <table class="rows">
    <thead><tr><th>tier, base first</th><th>files</th><th>lines</th><th>over budget</th></tr></thead>
    <tbody>
${
  empty
    ? `      <tr><td colspan="4">No source tree — nothing to stack.</td></tr>`
    : plan
        .map(
          (t) =>
            `      <tr><td class="q">${esc(t.district.name)}</td><td>${t.district.buildings.length}</td><td>${t.district.lines.toLocaleString()}</td><td class="${t.district.over ? "breach" : ""}">${t.district.over || "—"}</td></tr>`,
        )
        .join("\n")
}
    </tbody>
  </table>

  <p class="note"><strong>The aperture is a measurement, not a mood.</strong> It is
    ${lit.length}⁄${model.standing.length} exactly — the fraction of dimensions this repository has
    committed evidence for — and the tower below the beam is drawn in the same stone as the tower
    above it, because <em>unmeasured is not broken, it is unknown</em>. Every number here comes from
    the same derived model the map and the city read, so the three renderings cannot disagree about
    the repository. ${dark.length ? `The dark dimensions are named in the table above, each with the command that lights it — a finding that travels without its fix is half a finding.` : `Every dimension is lit; the Eye is open all the way.`}</p>
  <p class="note"><strong>Nothing here describes a person.</strong> This describes the code.</p>
</div>
</body>
</html>
`;
}

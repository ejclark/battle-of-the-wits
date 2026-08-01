// THE CHASSIS — one design system, so four views are one application.
//
// The overview and the history view were written a week apart and each carried its own copy of the
// same stylesheet. The clone gate caught the second copy the moment it existed, which is the earliest
// it could have: two pages that agree today and are edited separately do not agree for long, and the
// failure is silent — nothing goes red when one view's card border drifts from another's. A visitor
// does not read that as two files. They read it as an application that is not quite finished.
//
// So the tokens live once, here, and a view supplies CONTENT. What a card looks like is chassis; what
// counts as a budget worth worrying about is a conclusion and stays in the view that draws it — the
// same line render.mjs already draws between plumbing and judgment.
//
// NO WEBFONTS, and this is not a stylistic preference. `harness-serve` has no dependencies and the
// starter rule says a visualiser that needs an install before it renders is one nobody opens twice —
// a font fetched from a CDN is that install, wearing a stylesheet. A face that silently falls back is
// the visual form of the false green: it renders, it looks deliberate, and it is not what was
// specified. The system stack is chosen rather than settled for.
//
// BOTH THEMES, and the second one gets the same care as the first. The accent is checked on both
// grounds rather than inverted onto one and hoped for.

/**
 * The palette, as tokens.
 *
 * The neutrals carry a warm bias — the paper is `#fbfbf9` and not `#ffffff`, the ink `#16181a` and
 * not black — because a pure grey reads as un-chosen, and this is a tool people are asked to look at
 * every day. The accent is the burnt sienna that was already the link-hover colour, promoted to a
 * name so it can be used deliberately instead of appearing once by accident.
 *
 * SEMANTIC COLOUR IS NOT THE ACCENT. Good, warning and critical answer "what state is this in"; the
 * accent answers "what can I press". A page that spends its accent on a status has nothing left to
 * point with, and a status that shares the accent's hue stops meaning anything.
 */
export const TOKENS = `
:root{
  --paper:#fbfbf9; --card:#ffffff; --ink:#16181a; --dim:#6c7378; --rule:#e4e2dc;
  --accent:#b4552d; --accent-soft:#b4552d1a;
  --good:#2f6f5e; --warn:#b0602c; --crit:#a33a2c; --quiet:#6c7378;
  --shadow:0 1px 2px #16181a0a;
  --serif:ui-serif,Georgia,"Times New Roman",serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
@media(prefers-color-scheme:dark){
  :root{
    --paper:#14161a; --card:#191c21; --ink:#eceae4; --dim:#8b9296; --rule:#282c33;
    /* Lifted and desaturated rather than inverted — the sienna at full strength on a dark ground
       vibrates, and every semantic colour is re-picked against #14161a instead of assumed. */
    --accent:#e08a5c; --accent-soft:#e08a5c1f;
    --good:#5fd7af; --warn:#e0985d; --crit:#e57b6a; --quiet:#8b9296;
    --shadow:none;
  }
}
:root[data-theme="dark"]{
  --paper:#14161a; --card:#191c21; --ink:#eceae4; --dim:#8b9296; --rule:#282c33;
  --accent:#e08a5c; --accent-soft:#e08a5c1f;
  --good:#5fd7af; --warn:#e0985d; --crit:#e57b6a; --quiet:#8b9296;
  --shadow:none;
}
:root[data-theme="light"]{
  --paper:#fbfbf9; --card:#ffffff; --ink:#16181a; --dim:#6c7378; --rule:#e4e2dc;
  --accent:#b4552d; --accent-soft:#b4552d1a;
  --good:#2f6f5e; --warn:#b0602c; --crit:#a33a2c; --quiet:#6c7378;
  --shadow:0 1px 2px #16181a0a;
}`;

/**
 * The chassis stylesheet. Layout does the spacing — flex and grid with `gap`, never per-element
 * margins that collapse into each other and are then fought with more margins.
 */
export const CHASSIS = `${TOKENS}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 var(--serif);
  -webkit-font-smoothing:antialiased}
.wrap{max-width:52rem;margin:0 auto;padding:0 1.5rem 4rem;display:flex;flex-direction:column;gap:1.75rem}

/* The identity rail. Slim on purpose: this is a tool, and a tool that opens with a hero has spent
   the reader's first screen on decoration they did not come for. */
header.rail{border-bottom:1px solid var(--rule);margin-bottom:.5rem;padding:1.75rem 0 0}
.rail .id{display:flex;align-items:baseline;gap:.7rem;flex-wrap:wrap}
.rail h1{font-size:1.4rem;margin:0;letter-spacing:-.01em;text-wrap:balance}
.rail .where{font:.7rem/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--dim)}
.rail p.blurb{margin:.5rem 0 0;color:var(--dim);font-size:.93rem;max-width:34rem}
nav.views{display:flex;gap:.25rem;flex-wrap:wrap;margin-top:1.15rem}
nav.views a{font:.78rem/1 var(--mono);letter-spacing:.06em;text-decoration:none;color:var(--dim);
  padding:.6rem .8rem;border-bottom:2px solid transparent;border-radius:2px 2px 0 0}
nav.views a:hover{color:var(--ink);background:var(--accent-soft)}
nav.views a[aria-current="page"]{color:var(--ink);border-bottom-color:var(--accent)}
a:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

/* Summary before detail. State reads at a glance from the tile, and the number confirms it. */
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr));gap:.75rem}
.tile{background:var(--card);border:1px solid var(--rule);border-radius:3px;padding:.85rem .95rem;
  box-shadow:var(--shadow);display:flex;flex-direction:column;gap:.3rem}
.tile .k{font:.66rem/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
.tile .v{font:1.55rem/1 var(--serif);font-variant-numeric:tabular-nums}
.tile .n{font-size:.8rem;color:var(--dim)}
.tile.good .v{color:var(--good)}.tile.warn .v{color:var(--warn)}.tile.crit .v{color:var(--crit)}

.card{background:var(--card);border:1px solid var(--rule);border-radius:3px;padding:1.1rem 1.3rem;
  box-shadow:var(--shadow);display:flex;flex-direction:column;gap:.8rem}
.card > .head{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;flex-wrap:wrap}
h2{font:.7rem/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin:0}
.card p{margin:0;color:var(--dim);font-size:.9rem;max-width:38rem}
.card p b,.card p strong{color:var(--ink);font-weight:600}

/* State encoded in form as well as colour, so it survives a monochrome screen and a colour-blind
   reader: the chip's border and its word both carry it. */
.chip{font:.68rem/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;padding:.28rem .55rem;
  border:1px solid currentColor;border-radius:2px;white-space:nowrap}
.good{color:var(--good)}.warn{color:var(--warn)}.crit{color:var(--crit)}.quiet{color:var(--quiet)}

.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:.88rem}
th{font:.66rem/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--dim);font-weight:400}
td,th{text-align:left;padding:.45rem .7rem .45rem 0;border-bottom:1px solid var(--rule);vertical-align:top}
tr:last-child td{border-bottom:0}
td.name{font:.85rem/1.4 var(--mono)}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums;color:var(--dim);white-space:nowrap}

/* The doors. A view you cannot find is a view nobody built. */
.doors{display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:.75rem}
.door{display:flex;flex-direction:column;gap:.3rem;text-decoration:none;color:inherit;
  background:var(--card);border:1px solid var(--rule);border-radius:3px;padding:.95rem 1.05rem;
  box-shadow:var(--shadow);transition:border-color .12s,transform .12s}
.door:hover{border-color:var(--accent);transform:translateY(-1px)}
.door b{font-size:1rem;font-weight:600}
.door span{font-size:.85rem;color:var(--dim)}
.door .path{font:.68rem/1 var(--mono);color:var(--dim);letter-spacing:.06em}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}

footer.note{color:var(--dim);font-size:.85rem;border-top:1px solid var(--rule);padding-top:1.1rem;
  display:flex;flex-direction:column;gap:.4rem}
code{font:.85em var(--mono)}`;

/** Every view this server serves, in the order they are meant to be met. */
export const NAV = [
  { path: "/", label: "Overview", blurb: "what the instruments say" },
  { path: "/history", label: "History", blurb: "what each budget looked like before today" },
  { path: "/map", label: "Map", blurb: "the repository as territory" },
  { path: "/city", label: "City", blurb: "the repository as a skyline" },
];

const navBar = (here) =>
  `<nav class="views" aria-label="Views">${NAV.map(
    (v) => `<a href="${v.path}"${v.path === here ? ' aria-current="page"' : ""}>${v.label}</a>`,
  ).join("")}</nav>`;

/**
 * The page skeleton every view is poured into.
 *
 * A DOCTYPE, because a fragment written without one opens in quirks mode — this repository has
 * already fixed that defect once, in the map, and a shared skeleton is how it stops recurring.
 */
export function page({ title, repoName, eyebrow, blurb = "", here = "/", body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>${CHASSIS}</style>
</head>
<body>
<div class="wrap">
<header class="rail">
  <div class="id"><h1>${repoName}</h1><span class="where">${eyebrow}</span></div>
  ${blurb ? `<p class="blurb">${blurb}</p>` : ""}
  ${navBar(here)}
</header>
${body}
<footer class="note">
  <span><b>Nothing here describes a person.</b> This describes the code.</span>
  <span>Live — every view re-derives from the repository on each request and reloads when it moves.
  Bound to localhost only, by construction.</span>
</footer>
</div>
</body>
</html>`;
}

/** A summary tile. `tone` encodes state; `note` says what the number means when it is not obvious. */
export const tile = (k, v, { tone = "", note = "" } = {}) =>
  `<div class="tile ${tone}"><span class="k">${k}</span><span class="v">${v}</span>${
    note ? `<span class="n">${note}</span>` : ""
  }</div>`;

/** A card with an uppercase heading and an optional state chip. */
export const card = (heading, body, chipHtml = "") =>
  `<section class="card"><div class="head"><h2>${heading}</h2>${chipHtml}</div>${body}</section>`;

export const chip = (tone, label) => `<span class="chip ${tone}">${label}</span>`;

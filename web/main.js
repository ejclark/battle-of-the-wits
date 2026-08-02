// THE CLIENT APP — the same model, rendered in the browser, hot-reloading while you edit it.
//
// The server-rendered views answer "what is this repository" for anyone who typed `npm start`. This
// answers it for someone CHANGING a view: edit a render function and the page updates without a
// reload and without losing which tab you were on. That is the entire reason a bundler exists here.
//
// NO FRAMEWORK. Four views over one JSON document does not need a virtual DOM, and a dependency
// nobody can debug is a worse trade than a hundred lines of explicit rendering. Every function below
// takes data and returns an element; the state lives in one object; a change re-renders one node.
//
// THE REFUSALS ARE THE CLIENT'S JOB TOO. `lit: false` is not zero and `tracked: false` is not a flat
// line, and rendering either as its zero would be the false green with better typography. The API
// carries the distinction in its shape and this file honours it in every renderer that touches them.
import "./app.css";

const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v === true ? "" : String(v));
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return n;
};

const tile = (k, v, { tone = "", note = "" } = {}) =>
  el("div", { class: `tile ${tone}` }, el("span", { class: "k" }, k), el("span", { class: "v" }, v), note && el("span", { class: "n" }, note));

const card = (heading, chip, ...body) =>
  el("section", { class: "card" }, el("div", { class: "head" }, el("h2", {}, heading), chip), ...body);

const chip = (tone, label) => el("span", { class: `chip ${tone}` }, label);

/**
 * A sparkline, baselined at zero.
 *
 * Same rule as the server's: a min-baselined line turns 400 → 398 into a cliff, which is technically
 * drawn from real numbers and wrong about the only thing a reader takes from a picture.
 */
function sparkline(points, { w = 260, h = 38 } = {}) {
  const measured = points.filter((p) => p.total !== null);
  if (measured.length < 2) return null;
  const max = Math.max(...measured.map((p) => p.total), 1);
  const x = (i) => (i / (measured.length - 1)) * (w - 2) + 1;
  const y = (v) => h - 1 - (v / max) * (h - 2);
  const d = measured.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(" ");

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${measured.length} readings, ${measured[0].total} to ${measured.at(-1).total}`);
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.5");
  const dot = document.createElementNS(ns, "circle");
  dot.setAttribute("cx", x(measured.length - 1).toFixed(1));
  dot.setAttribute("cy", y(measured.at(-1).total).toFixed(1));
  dot.setAttribute("r", "2.5");
  dot.setAttribute("fill", "currentColor");
  svg.append(path, dot);
  return svg;
}

// ── views ──────────────────────────────────────────────────────────────────────

export function overview(state) {
  const lit = state.gates.filter((g) => g.lit);
  const dark = state.gates.filter((g) => !g.lit);
  const d = state.direction;

  const direction = !d.readable
    ? { tone: "quiet", label: "not enough history", detail: `${d.records} record${d.records === 1 ? "" : "s"} — direction needs at least 10 ratchets to mean anything` }
    : d.down > d.up
      ? { tone: "good", label: "paying down", detail: `${d.down} down against ${d.up} up` }
      : d.up > d.down
        ? { tone: "warn", label: "negotiating", detail: `${d.up} raises against ${d.down} reductions — every raise needed a written reason, and they were all given` }
        : { tone: "quiet", label: "level", detail: `${d.down} down, ${d.up} up` };

  return [
    el(
      "div",
      { class: "tiles" },
      tile("Gates lit", `${state.counts.lit}/${state.counts.gates}`, {
        tone: dark.length ? "warn" : "good",
        note: dark.length ? `${dark.length} never frozen` : "every dimension measured",
      }),
      tile("Direction", direction.label, { tone: direction.tone, note: `${d.records} ledger records` }),
      tile("Justified raises", lit.reduce((n, g) => n + g.justified, 0), { note: "each one carries a written reason" }),
    ),
    card(
      "Direction",
      chip(direction.tone, direction.label),
      el("p", {}, `${direction.detail}.`),
      d.readable && d.up > d.down
        ? el("p", {}, el("b", {}, "A raise is not a failure"), " — every one carries a written reason, which is the rail working. But a ratchet that has only ever gone one way is a ratchet in name.")
        : null,
    ),
    card(
      `Gates — ${lit.length} lit${dark.length ? `, ${dark.length} unlit` : ""}`,
      null,
      el(
        "div",
        { class: "scroll" },
        el(
          "table",
          {},
          el("thead", {}, el("tr", {}, el("th", {}, "gate"), el("th", { class: "n" }, "budget"), el("th", { class: "n" }, "entries"), el("th", { class: "n" }, "raises"))),
          el(
            "tbody",
            {},
            lit.map((g) =>
              el(
                "tr",
                {},
                el("td", { class: "name" }, g.gate),
                el("td", { class: "n" }, g.budget ?? "—"),
                el("td", { class: "n" }, g.entries || "—"),
                el("td", { class: "n" }, g.justified ? `${g.justified} justified` : ""),
              ),
            ),
          ),
        ),
      ),
      // UNLIT IS NOT ZERO — said in words, not implied by an empty row.
      dark.length
        ? el("p", {}, el("b", {}, "Unlit is not zero."), ` ${dark.map((g) => g.gate).join(", ")} ${dark.length === 1 ? "has" : "have"} never been frozen — that is unmeasured, not clean.`)
        : null,
    ),
  ];
}

export function historyView(state) {
  const tracked = state.history.filter((s) => s.tracked);
  const untracked = state.history.filter((s) => !s.tracked);
  const moved = tracked.filter((s) => (s.verdict.moves ?? 0) > 0).length;

  return [
    el(
      "div",
      { class: "tiles" },
      tile("Budgets tracked", `${state.counts.tracked}/${state.history.length}`, {
        tone: untracked.length ? "warn" : "good",
        note: untracked.length ? `${untracked.length} never committed` : "every gate has a record",
      }),
      tile("Have moved", moved, { note: moved ? "at least one change on record" : "frozen and never revisited" }),
      tile("Window", tracked[0]?.window ?? 0, { note: "commits walked per budget" }),
    ),
    ...tracked.map((s) =>
      card(
        s.gate,
        chip(s.verdict.tone, s.verdict.label),
        el("div", { class: `spark ${s.verdict.tone}` }, sparkline(s.points)),
        el(
          "div",
          { class: "scroll" },
          el(
            "table",
            {},
            el("thead", {}, el("tr", {}, el("th", {}, "when"), el("th", { class: "n" }, "total"), el("th", {}, "commit"), el("th", {}, "subject"))),
            el(
              "tbody",
              {},
              [...s.points].reverse().map((p) =>
                el("tr", {}, el("td", { class: "name" }, p.date), el("td", { class: "n" }, p.total ?? "—"), el("td", { class: "name" }, p.sha), el("td", {}, p.subject)),
              ),
            ),
          ),
        ),
        s.truncated ? el("p", {}, `Showing the most recent ${s.window} commits to ${s.file}. There is more history behind this window.`) : null,
      ),
    ),
    untracked.length
      ? card(
          "No history",
          null,
          el("p", {}, el("b", {}, "Unlit is not zero."), ` ${untracked.map((s) => s.file).join(", ")} ${untracked.length === 1 ? "has" : "have"} never been committed here — there is nothing to read, which is not the same as a budget that has held steady.`),
        )
      : null,
  ];
}

// The two views that are still server-rendered. Linked rather than reimplemented, because a
// half-ported view that silently disagrees with the real one is worse than an honest link out.
const SERVER_VIEWS = [
  { path: "/map", label: "Map", blurb: "the repository as territory" },
  { path: "/city", label: "City", blurb: "the repository as a skyline" },
];

const VIEWS = [
  { id: "overview", label: "Overview", blurb: "What this repository's own instruments say.", render: overview },
  { id: "history", label: "History", blurb: "What each budget looked like before today, read from git.", render: historyView },
];

// ── shell ──────────────────────────────────────────────────────────────────────

const state = { data: null, view: "overview", error: null };

function render() {
  const root = document.getElementById("app");
  root.removeAttribute("aria-busy");
  root.replaceChildren();

  if (state.error) {
    // An error page that does not say what to do is a dead end. The most likely cause by far is that
    // the data server is not running, so that is what it says.
    root.append(
      el(
        "div",
        { class: "wrap" },
        card(
          "Cannot read the repository",
          chip("crit", "no data"),
          el("p", {}, state.error),
          el("p", {}, "The UI is served by rspack and the data by the harness. Start the data server with ", el("b", {}, "npm run dev"), ", which runs both."),
        ),
      ),
    );
    return;
  }

  const view = VIEWS.find((v) => v.id === state.view);
  root.append(
    el(
      "div",
      { class: "wrap" },
      el(
        "header",
        { class: "rail" },
        el("div", { class: "id" }, el("h1", {}, state.data.repo), el("span", { class: "where" }, view.label)),
        el("p", { class: "blurb" }, view.blurb),
        el(
          "nav",
          { class: "views", "aria-label": "Views" },
          VIEWS.map((v) =>
            el(
              "button",
              {
                type: "button",
                "aria-current": v.id === state.view ? "page" : false,
                onClick: () => {
                  state.view = v.id;
                  render();
                },
              },
              v.label,
            ),
          ),
          SERVER_VIEWS.map((v) => el("a", { href: v.path, class: "server-view", title: v.blurb }, v.label)),
        ),
      ),
      ...view.render(state.data),
      el(
        "footer",
        { class: "note" },
        el("span", {}, el("b", {}, "Nothing here describes a person."), " This describes the code."),
        el("span", {}, "Live — the model re-derives from the repository on every request. Bound to localhost only, by construction."),
      ),
    ),
  );
}

async function load() {
  try {
    const res = await fetch("/api/state");
    if (!res.ok) throw new Error(`the data server answered ${res.status}`);
    state.data = await res.json();
    state.error = null;
  } catch (err) {
    state.error = String(err?.message ?? err);
  }
  render();
}

load();

// Hot module replacement. Editing a view re-renders it in place — same data, same tab, same scroll
// position — which is the difference between adjusting a layout and losing your place twenty times.
if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
  import.meta.webpackHot.dispose(() => {});
}

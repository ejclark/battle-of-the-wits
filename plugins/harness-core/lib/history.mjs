// THE HISTORY — what a budget looked like before today.
//
// Every budget file in this repository is committed, which means the whole record of what this
// project owed and when is already in git and nothing reads it. The overview answers "what is the
// debt now" and, from the run ledger, "which way has it moved lately". Neither can answer the
// question somebody actually asks in a review: *was this file always like this?*
//
// The data source is deliberately git and NOT the run ledger. The ledger records ratchets — moves
// the scanners made — so it is blind to a budget edited by hand, and a hand-edit is exactly the move
// worth being able to see. The commits cannot be blind to it: the file changed or it did not.
//
// NOTHING ABOUT A PERSON, same rule as the overview and for the same reason. `git log` will hand you
// an author on every line and it costs one format specifier to render it. This reads the SHA, the
// date and the subject, and stops there. A history view that names who raised a budget is a
// leaderboard for blame, and it changes what people do — toward hiding the raise.
//
// NO SILENT CAPS. Reading a budget at N commits costs N `git show` calls, so the walk is bounded.
// When the bound bites, the page says which window it drew and that there is more behind it — a
// truncated series rendered as if it were the whole story is a picture that lies.
import { GATES, budgetTotal } from "./state.mjs";
import { esc, gitOut } from "./render.mjs";

/** How far back a single budget is walked. Bounded on purpose; the bound is reported, never hidden. */
export const WINDOW = 40;

/**
 * One budget's series, oldest first.
 *
 * `tracked: false` covers three different situations that look identical from here — no git, no
 * commits, or a budget this repository has never frozen — and they are collapsed on purpose, because
 * the honest thing to render for all three is the same: nothing to draw, and say why rather than
 * draw a flat line at zero.
 */
export function budgetSeries(root, gate, { window = WINDOW } = {}) {
  const file = `${gate}-budget.json`;
  const log = gitOut(root, ["log", "--follow", `--max-count=${window + 1}`, "--format=%H%x09%ad%x09%s", "--date=short", "--", file]);
  const lines = (log ?? "").split("\n").filter((l) => l.trim());
  if (!lines.length) return { gate, file, tracked: false, truncated: false, points: [] };

  const truncated = lines.length > window;
  const points = [];
  for (const line of lines.slice(0, window).reverse()) {
    const [sha, date, ...rest] = line.split("\t");
    const blob = gitOut(root, ["show", `${sha}:${file}`]);
    let total = null;
    try {
      total = budgetTotal(JSON.parse(blob ?? ""));
    } catch {
      total = null; //  the file existed but was not readable JSON at that commit — a gap, not a zero
    }
    points.push({ sha: sha.slice(0, 7), date, subject: rest.join("\t"), total });
  }
  return { gate, file, tracked: true, truncated, points };
}

/** Every gate's series. */
export function history(root, opts) {
  return GATES.map((gate) => budgetSeries(root, gate, opts));
}

/**
 * What a series says, in one sentence.
 *
 * A single commit is NOT a trend and does not get an arrow — same floor discipline as the overview's
 * direction card, which refuses to draw direction from fewer than ten ratchets. Here the honest floor
 * is lower because each point is an actual observed value rather than a sampled event, but one point
 * is still one point.
 */
export function verdict(series) {
  const measured = series.points.filter((p) => p.total !== null);
  if (!measured.length) return { tone: "quiet", label: "no readings" };
  if (measured.length === 1) return { tone: "quiet", label: "frozen once, never moved since" };
  const first = measured[0].total;
  const last = measured.at(-1).total;
  const moves = measured.slice(1).filter((p, i) => p.total !== measured[i].total).length;
  if (last < first) return { tone: "good", label: `down ${first - last} since ${measured[0].date}`, moves };
  if (last > first) return { tone: "warn", label: `up ${last - first} since ${measured[0].date}`, moves };
  return { tone: "quiet", label: `level since ${measured[0].date}`, moves };
}

/**
 * A sparkline, as inline SVG.
 *
 * Baselined at zero rather than at the series minimum. A min-baselined sparkline turns a budget that
 * went 400 → 398 into a cliff, which is the chart equivalent of the false green: technically drawn
 * from real numbers and wrong about the only thing the reader takes away.
 */
export function sparkline(points, { w = 220, h = 34 } = {}) {
  const measured = points.filter((p) => p.total !== null);
  if (measured.length < 2) return "";
  const max = Math.max(...measured.map((p) => p.total), 1);
  const x = (i) => (i / (measured.length - 1)) * (w - 2) + 1;
  const y = (v) => h - 1 - (v / max) * (h - 2);
  const d = measured.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(
    `${measured.length} readings, ${measured[0].total} to ${measured.at(-1).total}`,
  )}"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="${x(measured.length - 1).toFixed(
    1,
  )}" cy="${y(measured.at(-1).total).toFixed(1)}" r="2.5" fill="currentColor"/></svg>`;
}

export function historyDocument(root, repoName, { series = history(root) } = {}) {
  const tracked = series.filter((s) => s.tracked);
  const untracked = series.filter((s) => !s.tracked);

  const card = (s) => {
    const v = verdict(s);
    const rows = [...s.points]
      .reverse()
      .map(
        (p) =>
          `<tr><td>${esc(p.date)}</td><td class="n">${p.total ?? "—"}</td><td class="sha">${esc(p.sha)}</td>` +
          `<td class="sub">${esc(p.subject)}</td></tr>`,
      )
      .join("");
    return `<div class="card">
  <div class="head"><h2>${esc(s.gate)}</h2><span class="tag ${v.tone}">${esc(v.label)}</span></div>
  <div class="spark ${v.tone}">${sparkline(s.points)}</div>
  <table><tbody>${rows}</tbody></table>
  ${s.truncated ? `<p>Showing the most recent ${WINDOW} commits to <code>${esc(s.file)}</code>. There is more history behind this window.</p>` : ""}
</div>`;
  };

  return `<!doctype html><meta charset="utf-8"><title>${esc(repoName)} — budget history</title>
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
color:var(--dim);margin:0}
.tag{font:0.7rem/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;
padding:.25rem .5rem;border:1px solid currentColor;border-radius:2px}
.good{color:var(--good)}.warn{color:var(--warn)}.quiet{color:var(--quiet)}
.spark{margin:.9rem 0 .4rem}
table{border-collapse:collapse;width:100%;font-size:.85rem}
td{text-align:left;padding:.35rem .6rem .35rem 0;border-bottom:1px solid var(--rule);vertical-align:top}
td:first-child{font-family:ui-monospace,Menlo,monospace;color:var(--dim);white-space:nowrap}
.n{text-align:right;font-variant-numeric:tabular-nums;width:4rem}
.sha{font-family:ui-monospace,Menlo,monospace;color:var(--dim);white-space:nowrap}
.sub{color:var(--dim)}
p{margin:.7rem 0 0;color:var(--dim);font-size:.9rem}
code{font-family:ui-monospace,Menlo,monospace;font-size:.85em}
nav{margin-top:2rem;font-size:.9rem}nav a{color:inherit;margin-right:1.2rem}
</style>
<h1><small>budget history</small>${esc(repoName)}</h1>
<p>Every budget file is committed, so this is read from git rather than from the run ledger — a
budget edited by hand leaves no ratchet record, and a hand-edit is the move worth seeing.</p>

${tracked.map(card).join("\n")}
${
  untracked.length
    ? `<div class="card"><h2>No history</h2><p><b>Unlit is not zero.</b> ${untracked
        .map((s) => `<code>${esc(s.file)}</code>`)
        .join(", ")} ${untracked.length === 1 ? "has" : "have"} never been committed here — there is nothing to
    read, which is not the same as a budget that has held steady.</p></div>`
    : ""
}

<nav><a href="/">← Overview</a><a href="/map">Map →</a><a href="/city">City →</a></nav>
<p>Nothing here describes a person. Git will hand you an author on every line; this reads the commit
and stops.</p>`;
}

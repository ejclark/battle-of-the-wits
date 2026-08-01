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
import { card, chip, page, tile } from "./shell.mjs";

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

  const gateCard = (s) => {
    const v = verdict(s);
    const rows = [...s.points]
      .reverse()
      .map(
        (p) =>
          `<tr><td class="name">${esc(p.date)}</td><td class="n">${p.total ?? "&mdash;"}</td>` +
          `<td class="name">${esc(p.sha)}</td><td>${esc(p.subject)}</td></tr>`,
      )
      .join("");
    return card(
      esc(s.gate),
      `<div class="spark ${v.tone}">${sparkline(s.points)}</div>
      <div class="scroll"><table>
        <thead><tr><th>when</th><th class="n">total</th><th>commit</th><th>subject</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>` +
        (s.truncated
          ? `<p>Showing the most recent ${WINDOW} commits to <code>${esc(s.file)}</code>. There is more history behind this window.</p>`
          : ""),
      chip(v.tone, esc(v.label)),
    );
  };

  const moved = tracked.filter((s) => verdict(s).moves > 0).length;
  const tiles = [
    tile("Budgets tracked", `${tracked.length}<span class="n">/${series.length}</span>`, {
      tone: untracked.length ? "warn" : "good",
      note: untracked.length ? `${untracked.length} never committed` : "every gate has a record",
    }),
    tile("Have moved", moved, { note: moved ? "at least one change on record" : "frozen and never revisited" }),
    tile("Window", WINDOW, { note: "commits walked per budget" }),
  ].join("");

  const body = `
<div class="tiles">${tiles}</div>

${tracked.map(gateCard).join("\n")}
${
  untracked.length
    ? card(
        "No history",
        `<p><b>Unlit is not zero.</b> ${untracked
          .map((s) => `<code>${esc(s.file)}</code>`)
          .join(", ")} ${
          untracked.length === 1 ? "has" : "have"
        } never been committed here — there is nothing to read, which is not the same as a budget that has held steady.</p>`,
      )
    : ""
}`;

  return page({
    title: `${esc(repoName)} — budget history`,
    repoName: esc(repoName),
    eyebrow: "History",
    blurb:
      "Every budget file is committed, so this is read from git rather than from the run ledger — a budget edited by hand leaves no ratchet record, and a hand-edit is the move worth seeing.",
    here: "/history",
    body,
  });
}

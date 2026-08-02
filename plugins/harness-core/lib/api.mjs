// THE STATE, AS DATA — one JSON document describing this repository right now.
//
// The server-rendered views assemble HTML from these same functions. This hands back the model
// instead, so a client-side app can render it, and so anything else that wants the numbers can have
// them without scraping a page.
//
// ONE ENDPOINT, NOT SIX. A view that needs four fetches to draw one screen spends its first paint on
// round trips and has four ways to be half-loaded. Everything here is derived from files already on
// disk in a few milliseconds — there is no expensive half to defer, so splitting it would buy
// latency and complexity and nothing else.
//
// THE REFUSALS TRAVEL WITH THE DATA, which is the part worth being careful about. `lit: false` and
// `tracked: false` are not zeroes and must never arrive as zeroes; a client that cannot tell
// "unmeasured" from "clean" will render the false green this project exists to prevent, and it will
// do it in a nicer font. So the distinction is carried in the shape rather than left to a convention
// somebody has to remember.
//
// AND NOTHING ABOUT A PERSON. Same rule as every other surface, and it needs restating here because
// an API is exactly where somebody would reach for `git log --format=%an` to make a page look busier.
import { GATES } from "./state.mjs";
import { gateStates, trend } from "./overview.mjs";
import { WINDOW, history, verdict } from "./history.mjs";
import { repoNameOf } from "./render.mjs";

/** The whole model, in one document. */
export function stateOf(root) {
  const gates = gateStates(root);
  const series = history(root);
  const t = trend(root);

  return {
    repo: repoNameOf(root),
    gates: gates.map((g) => ({
      gate: g.gate,
      // `lit` is the load-bearing field: false means never frozen, and `budget` is null rather than
      // 0 so a client cannot accidentally add it up into a total that reads as clean.
      lit: g.lit,
      budget: g.lit ? g.budget : null,
      entries: g.entries,
      justified: g.justified ?? 0,
    })),
    direction: {
      records: t.records,
      // Below the floor, say so. Direction from a handful of samples is noise wearing a trend's
      // clothes, and a client drawing an arrow from four points is lying with a picture.
      readable: t.readable,
      down: t.down,
      up: t.up,
      delta: t.delta,
    },
    history: series.map((s) => ({
      gate: s.gate,
      file: s.file,
      tracked: s.tracked,
      truncated: s.truncated,
      window: WINDOW,
      verdict: verdict(s),
      // The commit, never the committer.
      points: s.points.map((p) => ({ sha: p.sha, date: p.date, subject: p.subject, total: p.total })),
    })),
    counts: {
      gates: GATES.length,
      lit: gates.filter((g) => g.lit).length,
      tracked: series.filter((s) => s.tracked).length,
    },
  };
}

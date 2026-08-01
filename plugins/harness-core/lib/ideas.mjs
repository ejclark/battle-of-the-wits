// THE IDEA LOG, READ AS A GRAPH — so the backlog can compete with the debt.
//
// `harness-dungeon --today` answers "what should I build?" by reading budgets, which means it can
// only ever propose CLEANING. Ask it on a repository where every gate is green and it offers
// low-urgency tidying, because tidying is the only thing it can see. Meanwhile the ideas worth
// building sit in a Markdown file that nothing reads.
//
// This makes that file legible. Two rules keep it honest:
//
//   1. **NOTHING IS INVENTED.** A proposed build is an idea a human wrote down, quoted back. The
//      tool does not generate ideas, score them on a scale it made up, or decide what matters.
//   2. **THE ONE DERIVED SIGNAL IS STATED AS A PROXY.** Ideas reference each other — "#7 attacked
//      from the opposite end", "pairs with #30 as its first consumer". An idea that OTHER ideas keep
//      pointing at is load-bearing in a way its author may not have noticed, and in-degree is a
//      cheap, checkable measure of that. It is a proxy for importance, not importance, and the
//      renderer says so rather than presenting a rank as a verdict.
//
// Association density as a priority signal is itself a banked idea; this is the smallest honest
// version of it. A richer one (semantic clustering, "which ideas would this unlock") needs a model
// in the loop, and a tool that quietly needed a model in the loop would be a different product.
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Sections that mean "not a candidate to build" — done, or already underway. */
const CLOSED = /^##\s+(in progress|shipped|done|archive)/i;

/**
 * Entry heads this recognises, in the shapes an idea log actually uses:
 *   **12. A title.**      — a numbered bold lead-in, the form this project's log uses
 *   ### 12. A title       — a numbered heading
 *   ### A title           — an unnumbered heading
 * A file using none of them parses to nothing, which reads as "no ideas banked" rather than as a
 * crash — the same posture every gate takes toward a dimension it cannot measure.
 */
const HEADS = [
  /^\*\*(\d+)\.\s+(.+?)\.?\*\*/,
  /^###\s+(\d+)\.\s+(.+?)\s*$/,
  /^###\s+(?!\d)(.+?)\s*$/,
];

function headOf(line) {
  for (const re of HEADS) {
    const m = line.match(re);
    if (!m) continue;
    return m.length > 2 ? { n: Number(m[1]), title: m[2] } : { n: null, title: m[1] };
  }
  return null;
}

/** `_(src: Eric · while: …)_` — who raised it and in what context. Absent is fine. */
const srcOf = (body) => (body.match(/_\(src:\s*([^)]+)\)_/) ?? [, null])[1]?.replace(/\s+/g, " ").trim() ?? null;

/**
 * Parse an idea log into open entries with their outbound references.
 *
 * @param {string} text  the raw Markdown
 * @returns {Array<{n:number|null,title:string,src:string|null,refs:number[],inbound:number[]}>}
 */
export function parseIdeas(text) {
  const lines = text.split("\n");
  const open = [];
  let closed = false;
  let current = null;
  const flush = () => {
    if (!current) return;
    const body = current.body.join("\n");
    open.push({
      n: current.n,
      title: current.title,
      src: srcOf(body),
      // A reference is `#12` — the form these logs use to point at each other. A self-reference is
      // dropped, since an idea citing its own number is a formatting artefact, not an association.
      refs: [...new Set([...body.matchAll(/#(\d+)\b/g)].map((m) => Number(m[1])))].filter((r) => r !== current.n),
      inbound: [],
    });
    current = null;
  };

  for (const line of lines) {
    if (/^##\s/.test(line)) {
      flush();
      closed = CLOSED.test(line);
      continue;
    }
    if (closed) continue;
    const head = headOf(line);
    if (head) {
      flush();
      current = { ...head, body: [line] };
    } else if (current) {
      current.body.push(line);
    }
  }
  flush();

  // Second pass: who points at whom. Done here rather than by the caller so every consumer of an
  // idea sees the same association count — the same rule the visual ladder runs on.
  const byNumber = new Map(open.filter((i) => i.n !== null).map((i) => [i.n, i]));
  for (const idea of open) {
    for (const r of idea.refs) byNumber.get(r)?.inbound.push(idea.n);
  }
  return open;
}

/**
 * The open ideas in a repository, most-referenced first.
 *
 * An adopter with no such file gets an empty list and no dungeon — silence, rather than an invented
 * one. The path is a PARAMETER rather than a descriptor key on purpose: `harness.json` documents its
 * own rule that a key nothing reads is a promise the harness does not keep, so `ideasFile` gets
 * added in the change that needs it, by an adopter who actually keeps their log somewhere else.
 */
export function openIdeas(root, file = "docs/IDEAS.md") {
  let text;
  try {
    text = readFileSync(join(root, file), "utf8");
  } catch {
    return [];
  }
  return parseIdeas(text).sort(
    (a, b) => b.inbound.length - a.inbound.length || (a.n ?? Infinity) - (b.n ?? Infinity),
  );
}

/**
 * The banked ideas as a campaign, or null when a repository has no log.
 *
 * Lives here rather than with the other campaigns because it is a statement about IDEAS: what counts
 * as one, how they rank, and what the ranking does and does not claim. `campaigns.mjs` decides where
 * it goes in the list, which is a different question and the only one that belongs there.
 */
export function drawingBoard(root) {
  const ideas = openIdeas(root);
  if (!ideas.length) return null;
  return {
    id: "drawing-board",
    name: "The Drawing Board",
    theme: `${ideas.length} idea${ideas.length === 1 ? "" : "s"} banked and unbuilt. Ranked by how many OTHER ideas point at them.`,
    encounters: ideas.slice(0, 4).map((i) => ({
      label: i.title,
      detail: i.title,
      stat: i.inbound.length ? `${i.inbound.length} refs` : i.src ? i.src.split("·")[0].trim() : "banked",
    })),
    payoff:
      "You build the thing the backlog has been circling. In-degree is a PROXY for load-bearing — an idea others keep pointing at is doing more work than its author noticed — not a verdict, and not a ranking anything computed on its own.",
    party: "you — nothing here is derived from a gate, so nothing here is an athlete's call",
    weight: -1, // never outranks a measured finding
  };
}

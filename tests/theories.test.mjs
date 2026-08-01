// A theory register with no falsifiers is a wall of quotes, and a wall of quotes accelerates nothing.
//
// The whole value of importing known patterns is that they are HYPOTHESES you can test faster than
// you could invent them. The moment an entry loses its falsifier it stops being a hypothesis and
// becomes a citation — something that sounds like support, cannot be checked, and quietly gets relied
// on anyway. That is the exact failure the theorist agent exists to prevent, arriving through the
// front door instead.
//
// So the admission rule is mechanical, the same way the metaphor catalog's breaking-point rule is:
// no falsifier, no entry, enforced here rather than requested in prose.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOC = readFileSync(join(REPO, "plugins/harness-core/docs/THEORIES.md"), "utf8");

const STATUSES = ["untested", "holds", "shifted", "inverted", "unstated"];

/**
 * Every registered claim — the bolded sentence, its status, and its body.
 *
 * SPLIT rather than a lookahead: the obvious `(?=\n\*\*|...|$)/gm` terminator silently truncates
 * every body to its FIRST LINE, because `m` makes `$` match at each line end. The falsifier check
 * below still passed (it is on line one) while the evidence check failed on entries that plainly
 * carry evidence — a parse bug that reads as a content failure is the worst kind of red.
 */
function entries() {
  const register = DOC.slice(DOC.indexOf("## The register"));
  return register
    .split(/^\*\*/m)
    .slice(1)
    .map((chunk) => {
      const head = chunk.match(/^(.+?)\*\*\s*·\s*`([a-z-]+)`/);
      return head ? { claim: head[1], status: head[2], body: chunk } : null;
    })
    .filter(Boolean);
}

test("the register parses, and holds enough entries to be worth having", () => {
  const all = entries();
  assert.ok(all.length >= 8, `the parse found ${all.length} entries — it is reading the file wrong, or the register is too thin to be a baseline`);
});

test("every registered theory states what would make it wrong HERE", () => {
  // The admission rule. An entry without this is not testable, and an untestable entry is worse than
  // an absent one: it looks like evidence in a document whose whole purpose is separating the two.
  const unfalsifiable = entries()
    .filter((e) => !/\*Falsifier:\*/.test(e.body))
    .map((e) => e.claim);
  assert.deepEqual(
    unfalsifiable,
    [],
    `registered without a falsifier:\n  ${unfalsifiable.join("\n  ")}\n\n` +
      "State what would have to be observed here for the claim to be wrong, or take it out.",
  );
});

test("every status is one the document defines", () => {
  // A status invented at the point of writing is how a vocabulary stops meaning anything. The table
  // at the top is the vocabulary; drifting from it silently is the drift this repo exists to catch.
  for (const e of entries()) {
    assert.ok(STATUSES.includes(e.status), `"${e.claim}" carries status \`${e.status}\`, which the register does not define`);
  }
  for (const s of STATUSES) {
    assert.match(DOC, new RegExp(`\\|\\s*\`${s}\``), `the status table lost \`${s}\``);
  }
});

test("a status that claims a test cites what the evidence was", () => {
  // `untested` is the honest default and needs nothing. Any status above it is an assertion that
  // something was CHECKED, and an assertion with no evidence is an opinion occupying a table cell —
  // which is precisely what this register was built to stop being.
  const tested = entries().filter((e) => e.status !== "untested");
  assert.ok(tested.length >= 3, "no theory has been moved off `untested` — the register is a reading list, not a test bench");
  const unevidenced = tested.filter((e) => !/\*Evidence:\*|Confirmed by|Load-bearing|\*See idea|this project|this repo/i.test(e.body)).map((e) => e.claim);
  assert.deepEqual(unevidenced, [], `moved off untested with no evidence cited:\n  ${unevidenced.join("\n  ")}`);
});

test("the register keeps the honest default available and used", () => {
  // A catalogue where everything is already settled is a catalogue nobody is actually testing. The
  // untested entries are the working set; losing them means the register has become decoration.
  const untested = entries().filter((e) => e.status === "untested");
  assert.ok(untested.length >= 2, "nothing is marked untested — either every belief here has been verified, or the register stopped being honest");
});

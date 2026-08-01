// THE ON-RAMP MUST NOT SEND ANYONE AT WORK THAT IS ALREADY DONE.
//
// CONTRIBUTING.md hands a newcomer three concrete tasks. Every one of them is a CLAIM ABOUT THIS
// REPOSITORY — "there is no glossary", "nothing links to this file", "these paragraphs are walls" —
// and claims about a repository go stale the moment the repository changes.
//
// That is not hypothetical. Task 2 used to read "docs/JOURNAL.md and docs/LESSONS.md exist and
// nothing anywhere links to them." Adding a table of contents to the README linked both, in a change
// that had nothing to do with onboarding and no reason to look at this file. The task survived,
// unchanged and now false, pointed at the one person in the project least able to tell it was false:
// someone new, alone, in their first week, who would have done the work, found it already done, and
// reasonably concluded they had misunderstood something.
//
// A stale task is worse than a missing one. A missing task costs an afternoon of not knowing what to
// do. A stale task costs an afternoon AND teaches a newcomer that this project's instructions cannot
// be trusted — which is the single most expensive thing they could learn in week one.
//
// SO THE TESTS BELOW FAIL WHEN A TASK IS *DONE*. That inversion is the whole design, and it is the
// same shape as every gate here: the condition is pinned, and improvement is what breaks it. Landing
// the glossary turns this suite red, and the red is the reminder to delete the task from the page.
//
//   ✔ Task still undone  → green.
//   ✘ Task completed     → RED. Delete the task from CONTRIBUTING.md; that is the fix.
//   ✘ Task never true    → RED. It should never have been written.
//
// Never fix a red here by loosening a predicate. The predicate IS the claim the page is making.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(REPO, rel), "utf8");
const ONRAMP = read("CONTRIBUTING.md");

/** Prose paragraphs only — tables, lists, headings and quotes are not walls of text. */
function paragraphs(rel) {
  return read(rel)
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\n/g, " "))
    .filter((p) => p && !/^[#|>\-*\d]/.test(p) && !p.startsWith("```"));
}

/** Every markdown file a newcomer plausibly reads before they know the vocabulary. */
function newcomerDocs() {
  const out = ["README.md", "CONTRIBUTING.md"];
  for (const dir of ["docs", "plugins/harness-core/docs", "plugins/harness-gates/docs"]) {
    if (!existsSync(join(REPO, dir))) continue;
    for (const f of readdirSync(join(REPO, dir))) if (f.endsWith(".md")) out.push(`${dir}/${f}`);
  }
  return out;
}

/** Files carrying a real markdown LINK to `target`. Naming a path in prose is not a way to reach it —
 *  which is the whole point of the task below, and why a substring match would answer the wrong
 *  question: CONTRIBUTING.md names `docs/README.md` precisely because you cannot get there. */
function inboundLinks(target) {
  const hits = [];
  for (const rel of newcomerDocs()) {
    if (rel === target) continue;
    const here = dirname(rel) === "." ? "" : dirname(rel);
    const links = [...read(rel).matchAll(/\]\(([^)]+)\)/g)].map((m) => join(here, m[1].split("#")[0]));
    if (links.includes(target)) hits.push(rel);
  }
  return hits;
}

// ── the three live tasks ───────────────────────────────────────────────────────
// Each entry pins one task on the page. `undone` must hold while the task is offered.

const TASKS = [
  {
    id: "1 · glossary",
    cue: "docs/GLOSSARY.md",
    undone: () => {
      assert.equal(existsSync(join(REPO, "docs/GLOSSARY.md")), false, "docs/GLOSSARY.md now exists — the task is DONE, delete it from CONTRIBUTING.md");
      // The other half of the claim: the words really are everywhere. Floors, not exact counts —
      // a number that has to be re-measured on every docs edit is a task list that rots by design.
      const corpus = newcomerDocs().map(read).join("\n").toLowerCase();
      for (const [term, floor] of [["gate", 300], ["athlete", 70], ["preflight", 30], ["ratchet", 30]]) {
        const n = corpus.split(term).length - 1;
        assert.ok(n >= floor, `CONTRIBUTING.md claims "${term}" appears over ${floor} times; counted ${n}`);
      }
    },
  },
  {
    id: "2 · docs/README.md unreachable",
    cue: "docs/README.md",
    undone: () => {
      assert.ok(existsSync(join(REPO, "docs/README.md")), "docs/README.md is gone — the task no longer describes anything");
      const links = inboundLinks("docs/README.md");
      assert.deepEqual(links, [], `docs/README.md is now linked from ${links.join(", ")} — the task is DONE, delete it from CONTRIBUTING.md`);
    },
  },
  {
    id: "3 · README walls",
    cue: "The README still has walls",
    undone: () => {
      const long = paragraphs("README.md").filter((p) => p.length > 300);
      assert.ok(long.length >= 3, `only ${long.length} README paragraphs run past 300 characters — the task is DONE, delete it from CONTRIBUTING.md`);
    },
  },
];

for (const t of TASKS) {
  test(`on-ramp task ${t.id} is still undone`, t.undone);
}

test("every task pinned here is still offered on the page", () => {
  for (const t of TASKS) {
    assert.ok(ONRAMP.includes(t.cue), `nothing on CONTRIBUTING.md mentions "${t.cue}" — this pin outlived its task`);
  }
});

test("every task offered on the page is pinned here", () => {
  // The section is fixed-width by design: three tasks, three pins. A fourth added without a pin is
  // exactly how the stale one survived — nothing was watching it.
  const section = ONRAMP.split("## Three things that genuinely need doing right now")[1]?.split("\n## ")[0] ?? "";
  assert.ok(section, "the task section was renamed — update this test with it");
  const offered = [...section.matchAll(/^\*\*\d+ · /gm)].length;
  assert.equal(offered, TASKS.length, `CONTRIBUTING.md offers ${offered} tasks but ${TASKS.length} are pinned — an unpinned task is one nobody is watching`);
});

test("every copy/paste one-shot in the README names things that exist", () => {
  // The README's shell blocks are the single most-pasted text in this project, and a wrong line in
  // one fails in someone else's terminal where nobody here can see it. Every name in them is
  // checkable against the repository, so none of it has any business being unverified.
  const readme = read("README.md");
  const marketplace = JSON.parse(read(".claude-plugin/marketplace.json"));
  const declared = new Set(marketplace.plugins.map((p) => p.name));

  const blocks = [...readme.matchAll(/```shell\n([\s\S]*?)```/g)].map((m) => m[1]);
  assert.ok(blocks.length >= 2, "the README lost a one-shot block — the newcomer path and the adopter path");

  for (const line of blocks.join("\n").split("\n").filter(Boolean)) {
    const market = line.match(/^\/plugin marketplace add ([\w-]+)\/([\w-]+)$/);
    if (market) {
      assert.equal(market[2], marketplace.name, `the block adds marketplace "${market[2]}"; this one is named "${marketplace.name}"`);
      continue;
    }
    const install = line.match(/^\/plugin install ([\w-]+)@([\w-]+)$/);
    if (install) {
      assert.ok(declared.has(install[1]), `the block installs "${install[1]}", which marketplace.json does not declare`);
      assert.equal(install[2], marketplace.name);
      continue;
    }
    const skill = line.match(/^\/([\w-]+):([\w-]+)$/);
    if (skill) {
      const dir = join(REPO, "plugins", skill[1], "skills", skill[2], "SKILL.md");
      assert.ok(existsSync(dir), `the block invokes /${skill[1]}:${skill[2]}, which is not a shipped skill`);
      // The frontmatter name is what actually resolves — a directory that disagrees with it is a
      // drill nobody can invoke by the name the README prints.
      assert.match(read(`plugins/${skill[1]}/skills/${skill[2]}/SKILL.md`), new RegExp(`^name:\\s*${skill[2]}$`, "m"));
      continue;
    }
    const cmd = line.match(/^(harness-[\w-]+)/);
    if (cmd) {
      const found = ["harness-core", "harness-gates"].some((p) => existsSync(join(REPO, "plugins", p, "bin", cmd[1])));
      assert.ok(found, `the block runs \`${cmd[1]}\`, which is not a launcher this repo ships`);
    }
  }
});

test("no path CONTRIBUTING.md names is one a newcomer cannot find", () => {
  // A first-week reader follows every path on the page literally. One that does not resolve reads as
  // "I have already broken something", which is the opposite of what this page is for.
  const missing = [];
  for (const m of ONRAMP.matchAll(/`([A-Za-z0-9_./-]+\.(?:md|mjs|json|yml))`/g)) {
    const p = m[1];
    if (p.startsWith("docs/GLOSSARY.md")) continue; // the one path named BECAUSE it does not exist
    if (!existsSync(join(REPO, p))) missing.push(p);
  }
  assert.deepEqual(missing, [], `CONTRIBUTING.md names paths that do not exist: ${missing.join(", ")}`);
});

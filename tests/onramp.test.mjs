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
import { missingPathsIn } from "./helpers.mjs";

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

test("the README says why you would care and how to start, and defers the rest", () => {
  // The README is the only page most people will ever read, and it does exactly two jobs: say why
  // this is worth your attention, and give you the one thing to paste. Everything else is reference,
  // and reference in front of a decision is a cost paid by every reader to serve a few.
  //
  // This grew to 84 open lines of tables before anyone noticed — not by a bad decision, by a dozen
  // reasonable ones, each adding something genuinely useful to a page nobody was measuring. That is
  // the only way this particular defect ever happens, which is why the ceiling is a test rather than
  // an intention.
  const readme = read("README.md");
  // Split on the TAG, not on one spelling of it. The first version matched the literal "<details>"
  // and silently measured the whole file the moment a drawer gained an id attribute — a check that
  // reads 171 lines as the open section is not stricter, it is broken.
  const open = readme.split(/<details\b/)[0];
  const lines = open.split("\n").length;
  // 70 rather than 55, raised once and deliberately: a sample of real output earns lines that a
  // table does not. It does the "why would I care" job faster than any paragraph, and it is the one
  // thing on the page that shows the product rather than describing it. The ceiling exists to stop
  // REFERENCE creeping above the fold — so it moves for a visual and not for another index.
  assert.ok(lines <= 70, `${lines} lines before the first drawer — the pitch, the picture, and the paste. Reference goes behind <details>.`);
  assert.match(open, /☠|⛬/, "the sample output is what buys the extra lines — if it is gone, the ceiling comes back down");

  // Both jobs must actually still be done up front. A ceiling met by deleting the reason to care
  // would pass the line count and fail the reader.
  assert.ok(open.includes("## Get started"), "the paste must be above the fold, not in a drawer");
  // ANY fenced block, not a ```shell one. The primary paste became plain English — a prompt rather
  // than a command — precisely because slash commands are not available on every Claude Code
  // surface, and asserting the language tag made a correct fix look like a regression. Third time
  // this suite has pinned a spelling instead of the thing it meant; the thing meant is "there is
  // something to copy, above the fold."
  assert.ok(/```[\s\S]*?```/.test(open), "the thing to paste has to be in the open — a link to it is one click too many");
  assert.ok(open.indexOf("Writing code got cheap") < open.indexOf("## Get started"), "why you would care comes before how to start");

  // And the deferred material must still be reachable. Brevity that loses the map is not brevity.
  for (const kept of ["CONTRIBUTORS.md", "DECIDING.md", "METAPHORS.md", "DESCRIPTOR.md"]) {
    assert.ok(readme.includes(kept), `${kept} fell out of the README entirely — it was meant to move into a drawer, not vanish`);
  }
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

test("CI checks the text the on-ramp tells a newcomer to get right", () => {
  // The defect this prevents was live and it blocked exactly one group. CI linted the BRANCH's
  // commit messages — which a squash-merge discards — while the pull request title, the text that
  // actually becomes the permanent commit, went unchecked. Backwards on its own terms.
  //
  // The cost fell entirely on someone working in the browser: GitHub's web editor pre-fills a commit
  // message of "Update FILENAME", which fails config-conventional. First pull request, red check, a
  // field CONTRIBUTING.md never mentioned, no obvious way to fix it from where they were standing.
  // Every rail here was built for processes; this is what that assumption cost the first human.
  //
  // So the invariant is a relationship, not a value: whatever CI lints must be the same thing the
  // page tells a newcomer to get right. Either alone can be correct while the pair is broken.
  const ci = read(".github/workflows/pipeline.yml");
  assert.match(ci, /pull_request\.title/, "CI must lint the PR title — a squash-merge throws the branch commits away");
  assert.doesNotMatch(
    ci,
    /commitlint --from/,
    "CI is linting the branch commit range again. A browser contributor cannot control those, and a squash-merge discards them.",
  );
  // Attacker-controlled text on a public repo must not reach a shell through interpolation.
  assert.doesNotMatch(ci, /run:.*\$\{\{\s*github\.event\.pull_request\.title/, "the PR title must pass through env, never straight into `run:` — that is a script injection");

  // And the page must say the same thing, in both directions: title checked, commit message not.
  assert.match(ONRAMP, /pull\s+request title/i, "CONTRIBUTING.md must name the title as the checked text");
  assert.match(ONRAMP, /commit message/i, "and must say the pre-filled commit message is fine as-is — otherwise they will hunt for a problem that is not there");
});

test("every drill the README lists is one the reader was told how to install", () => {
  // Reproduced against a real fresh install: the newcomer block installs harness-core only, and the
  // drill list offered /decompose, /dedupe and /ship — which ship in harness-gates. "Unknown
  // command" on the first thing a curious newcomer tries is a small failure with an outsized
  // message: it says the instructions are approximate.
  const readme = read("README.md");
  // One block now serves both audiences — the contributor path swaps its last LINE — so whatever it
  // installs is what every reader has. The earlier two-block version is what produced the defect:
  // the newcomer block pulled harness-core only while the drill list offered harness-gates skills.
  const block = [...readme.matchAll(/```shell\n([\s\S]*?)```/g)].map((m) => m[1]).find((b) => b.includes("/plugin install"));
  assert.ok(block, "the paste block is gone");
  const installed = new Set([...block.matchAll(/\/plugin install ([\w-]+)@/g)].map((m) => m[1]));

  // Where does each named drill actually live?
  const home = {};
  for (const plugin of ["harness-core", "harness-gates"]) {
    const dir = join(REPO, "plugins", plugin, "skills");
    if (existsSync(dir)) for (const s of readdirSync(dir)) home[s] = plugin;
  }
  // Only drills offered WITHOUT a caveat count — the list may name others as long as it says so.
  const unqualified = readme.split("**Drills**")[1]?.split("\n\n**")[0] ?? "";
  for (const m of unqualified.matchAll(/`\/([\w-]+)`/g)) {
    const drill = m[1];
    if (!home[drill]) continue; // not a skill; the list also names shell commands
    assert.ok(installed.has(home[drill]), `the README offers /${drill}, which ships in ${home[drill]} — a plugin the newcomer block never installs`);
  }
});

test("the escape ladder is present, and every rung it names is real", () => {
  // The on-ramp is new and the first people through it WILL hit defects. That is expected and fine.
  // What is not survivable is a defect with nowhere to go from — so the ladder is load-bearing in a
  // way the rest of this page is not, and it must not quietly rot when someone edits around it.
  //
  // It also has to be read BEFORE the first failure rather than after. An unexpected bug feels like
  // your own fault; an expected one feels like the job. Same event, opposite meaning, and the only
  // difference is whether anyone said so in advance — which is why placement is asserted too.
  assert.match(ONRAMP, /Nothing here is a dead end/, "the escape ladder was removed or renamed");
  assert.ok(
    ONRAMP.indexOf("Nothing here is a dead end") < ONRAMP.indexOf("Making a change, in the browser"),
    "the ladder must come BEFORE the mechanics — after the first failure is too late to be told failures are expected",
  );

  // Rung 3 sends them at an issue form. A ladder whose rung is a 404 is worse than no ladder.
  const forms = readdirSync(join(REPO, ".github/ISSUE_TEMPLATE")).filter((f) => f.endsWith(".yml") && f !== "config.yml");
  assert.ok(forms.length > 0, "the ladder points at an issue form and none is shipped");
  const bodies = forms.map((f) => read(`.github/ISSUE_TEMPLATE/${f}`)).join("\n");
  for (const m of ONRAMP.matchAll(/\*"([^"]+)"\*/g)) {
    if (!/confused/i.test(m[1])) continue;
    assert.ok(bodies.includes(m[1]), `the page sends people to a form called "${m[1]}", which no template declares`);
  }

  // Every label a form applies must be one the ladder can actually reach — a form referencing a
  // label the repo has not created fails on submit, which turns rung 3 into the dead end it exists
  // to prevent, at the exact moment someone is already stuck.
  const labels = [...bodies.matchAll(/^labels:\s*\[([^\]]*)\]/gm)].flatMap((m) => m[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")));
  assert.ok(labels.length > 0, "no form declares a label — nothing will be triageable");
  assert.deepEqual([...new Set(labels)].sort(), ["idea", "snag"], "the label set changed; create the new ones on GitHub before shipping this");
});

test("no path CONTRIBUTING.md names is one a newcomer cannot find", () => {
  // A first-week reader follows every path on the page literally. One that does not resolve reads as
  // "I have already broken something", which is the opposite of what this page is for.
  // A backticked name that is a LINK LABEL is not a claim about a path — the path is the link
  // target, and it is checked as itself below. `[`FIRST-APP.md`](plugins/.../FIRST-APP.md)` reads as
  // a broken path only to a parser that stopped at the backticks.
  const labels = [...ONRAMP.matchAll(/\[`([^`]+)`\]\(([^)]+)\)/g)].map((m) => m[1]);
  // docs/GLOSSARY.md is the one path named BECAUSE it does not exist.
  const missing = missingPathsIn(ONRAMP, REPO, { skip: [...labels, "docs/GLOSSARY.md"] });
  // And every link TARGET must resolve, which is the check the labels were standing in for.
  for (const m of ONRAMP.matchAll(/\]\(([^)#][^)]*)\)/g)) {
    const t = m[1].split("#")[0];
    if (/^https?:|^mailto:/.test(t)) continue;
    if (!existsSync(join(REPO, t))) missing.push(t);
  }
  assert.deepEqual(missing, [], `CONTRIBUTING.md names paths that do not exist: ${missing.join(", ")}`);
});

test("the stale-copy escape does not ask a non-technical person to type git", () => {
  // The rule this project kept breaking on the person it was written for. Someone who does not use
  // git cannot be unblocked by `git remote add … && git reset --hard`: not because pasting is hard,
  // but because when it fails — and it will — they cannot tell a typo from a wrong assumption from
  // a genuinely broken repository. A command is only useful to someone who can debug it.
  const readme = read("README.md");
  // Whitespace-normalised before matching: this prose is hard-wrapped at 100 columns, so any phrase
  // long enough to be worth asserting on will eventually straddle a newline. Matching the rendered
  // sentence rather than its current line breaks is the same lesson as everything else in this file.
  const flat = (t) => t.replace(/\s+/g, " ");
  const section = flat(readme.split("Already have a copy")[1]?.split("</details>")[0] ?? "");
  assert.ok(section, "the stale-copy escape is gone — it is the most common state after a failed first try");

  const raw = readme.split("Already have a copy")[1]?.split("</details>")[0] ?? "";
  for (const block of raw.matchAll(/```[a-z]*\n([\s\S]*?)```/g)) {
    assert.doesNotMatch(block[1], /^\s*git\s+\w/m, "the escape hands over a git command — describe the situation and let the tooling pick the commands");
  }
  assert.match(section, /zip download is not a clone/i, "it must name the thing that makes `pull` fail, or the failure reads as their mistake");
});

test("the setup paste is self-contained for a session that knows nothing", () => {
  // It is pasted into a FRESH session on an unknown machine: possibly Windows, possibly without Node
  // or git, possibly a folder that is not a repository yet. Every assumption it makes that turns out
  // false becomes an error the user reads as their own mistake — which is what happened four times
  // in one week to the first person who tried it.
  const readme = read("README.md");
  const paste = [...readme.matchAll(/```\n(Set up the dungeon-crawler[\s\S]*?)```/g)][0]?.[1];
  assert.ok(paste, "the setup paste is gone or its shape changed");

  for (const [assumption, cue] of [
    ["the toolchain exists", /node, npm and git/],
    // The trap that is worse than a missing tool: an installed one the open shell cannot see. That
    // is indistinguishable from a failed install to anybody who has not hit it before, and it is
    // exactly what happened on the first Windows machine to try this.
    ["a fresh install the shell cannot see", /invisible to the shell/],
    ["a missing tool gets explained, not just reported", /what it is for/],
    ["the folder is already a repository", /not a git repository/],
    ["git is the only way to obtain the harness", /download it/],
    ["someone will notice what failed", /whether that failure was mine or its/],
    ["someone will work out what is left for them", /only I can do/],
  ]) {
    assert.match(paste, cue, `the paste no longer covers: ${assumption}`);
  }

  // It must not name a bin/ launcher — Windows cannot execute those.
  assert.doesNotMatch(paste, /bin\/harness-/, "a #!/bin/sh launcher in the paste is unrunnable on Windows");

  // And the walkthrough must hand over the SAME paste. Two copies of the one instruction that
  // matters, in the file read by the person least able to spot the difference, is the drift this
  // project exists to prevent.
  const first = read("plugins/harness-core/templates/starter/FIRST-APP.md");
  assert.ok(first.includes(paste.trim()), "FIRST-APP.md ships a different setup paste from the README");
});

test("the patch-forward prompt refuses the things a stranger's session must not do", () => {
  // It runs unattended on somebody else's machine, fixing this repository as it goes. Two rails
  // matter more than everything else in it: never touch the irreversible class, and never guess.
  const doc = read("plugins/harness-core/templates/starter/PATCH-FORWARD.md");
  const paste = [...doc.matchAll(/```\n([\s\S]*?)```/g)][0]?.[1];
  assert.ok(paste, "the paste is gone or its fence changed");

  assert.match(paste, /\.github\/workflows\//, "the irreversible class must be named, not implied");
  assert.match(paste, /credentials/, "and so must credentials");
  assert.match(paste, /do not\s+guess/i, "a guessed fix that silences an error is worse than no fix — it hides the real one");
  assert.match(paste, /whether the fault is mine, my machine's, or the\s+harness/, "an unattributed failure is read as self-inflicted every time");
  assert.match(paste, /did NOT fix/, "what it could not fix must reach the PR too, or the report is a lie by omission");
  assert.match(paste, /as you go|as you work/, "the record has to be built during the work — a reconstruction is missing what mattered");
});

test("the way to start the local view is the same sentence on every platform", () => {
  // A newcomer's first Windows contributor found three defects in one afternoon, all of the same
  // shape: a command that resolves on POSIX and does not on Windows — no `npm.cmd`, no `PATHEXT`, no
  // shebang. The launcher twins fix that for `bin/`, but only once `bin/` is on PATH, and INSTALLING
  // A PLUGIN DOES NOT PUT IT THERE.
  //
  // So the start instruction has to route through `node` and a module path, which is identical
  // everywhere. This asserts the property rather than the sentence: any runnable serve command these
  // documents hand a reader must go through node, however it is worded.
  for (const file of ["README.md", "CONTRIBUTING.md"]) {
    const body = readFileSync(join(REPO, file), "utf8");
    // A bare `harness-serve` presented as the thing to RUN — in a fence, or after "run"/"open" —
    // is the platform-dependent form. Mentioning the name while explaining the difference is fine.
    const runnable = [...body.matchAll(/(?:^|\n)```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1]);
    for (const block of runnable) {
      for (const line of block.split("\n").map((l) => l.trim()).filter(Boolean)) {
        if (!/harness-serve/.test(line)) continue;
        assert.fail(`${file} tells a reader to run \`${line}\` — that needs PATH, which installing a plugin does not set`);
      }
    }
    // Either platform-neutral form counts. `npm start` resolves through the shell, which DOES
    // consult PATHEXT and finds npm.cmd — the Windows failures in this project all came from
    // execFileSync bypassing the shell, not from a human typing a command.
    assert.match(
      body,
      /npm start|node [\w./-]*serve\.mjs/,
      `${file} must give a platform-neutral way to start the local view`,
    );
  }
});

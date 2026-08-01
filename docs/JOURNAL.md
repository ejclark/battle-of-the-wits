# Journal

The **backward-looking, append-only** half of this repository. The backlog says what might happen;
this says what did, and — the part nothing else captures — *why it was decided that way*.

Git journals the code. `docs/adr/` journals the decisions. `docs/LESSONS.md` journals the failures.
None of them journal the **reasoning**: the path taken, the branch abandoned, the thing that turned
out to be a different idea wearing a hat. That derivation is the material worth telling stories from,
and it evaporates when a session ends.

**Rules.** Append only — never rewrite an entry; append a correction beneath it. Dated. Written for
someone who was not there.

---

## 2026-08-01 · The harness leaves home

**The arc, in three moves.** It is worth naming because it repeats: a brain dump of ideas that sound
useful → a layer of self-executing automation to run the plan → *systems online*, at which point the
instruction becomes **"build me a new dungeon to crawl."** Choose-your-own-adventure at work. The
third move is only available because the second one exists.

### Move one — the dump

Twenty-seven meta-system ideas landed in a few hours: artifact templates, self-healing loops, eval,
fleet management, a research role, swappable harnesses, a doctor/hospital diagnosis system, the
journal you are reading. The routing convention absorbed them; nothing was lost.

**The finding that surprised both of us:** the most valuable items came from **associations between
ideas, not from any single one.**

- The **capability descriptor** — nobody proposed it. Five separate threads independently demanded it
  (portability, harness themes, harness-as-host, the one-shot, bootstrap templates). When that many
  paths converge on one artifact, the artifact is the real work.
- **Eval** arrived as a bare word with nothing behind it, then got demanded from five directions —
  none of which was "build eval."
- **Coordination** was flagged as a *tangent*. It turned out to be the binding constraint on the
  entire throughput plan.
- The University metaphor's "a diploma is a real permission, not a badge" and the dungeon **loot
  table** turned out to be the same mechanic, arrived at many turns apart from opposite ends.

Association density — how many other ideas an idea docks onto — predicted importance before anyone
judged it. That was a hypothesis at the start of the day and a working sensor by the end.

### Move two — the automation that runs the plan

The harness was lifted out of `skynet-capital` into a plugin marketplace, then taught to run itself:
required check on `main`, auto-merge armed **at PR-open** (the window closes once a PR is clean), and
a release that survives a ruleset forbidding direct pushes. Seven PRs, and from #3 onward every one
merged itself on green and cut its own release.

**Three things had to be simultaneously true, and each was learned the hard way:**

1. Branch protection scoped to the **default branch only**. Scoped to *all* branches it deadlocks —
   a required check can never run on a branch that cannot be pushed.
2. Auto-merge armed **at open**, not after green. GitHub refuses it on a clean PR.
3. A required check that genuinely gates. Without one, auto-merge has nothing to wait on and merges
   *before* verification, which is worse than not having it.

**The unifying root cause of the day**, appearing four times in different clothes: *a correct change
to a shared system whose other actors were never enumerated.* Branch protection has more consumers
than pull requests. A shellcheck glob written against today's filenames exempts every file added
later. A ruleset scoped to all branches constrains more writers than intended. Each was invisible
until something tried to move.

### Move three — systems online

With the loop running, the instruction changed shape. Not *"fix this file"* but **"build me a new
dungeon."** `harness-dungeon --new` forges a crawl from measured debt: real bosses from committed
budgets, real fog where the repo cannot see, and a **hand of three genuinely different next moves**
rather than a ranked backlog — because a ranked list is someone else's decision handed over for
rubber-stamping, and a hand is a decision you actually make.

### What the dogfood cost, and bought

Pointing the harness at its own repository found **three false-greens in the shipped artifact** —
each one a gate that reported success while measuring almost nothing:

- the gate spec assumed `describe/it/expect`; under `node --test` the file was never discovered
- `arch-scan` and `dupe-scan` hardcoded `.ts`, measuring 1 file of 10 in this repo
- depth keyed on Biome and husky, which are preferences a repo may decline

**The best moment of the day:** the architecture gate refused to raise its own budget when the author
asked it to. `--update` only ever lowers. So `phases.mjs` got the decomposition the gate was pointing
at — `detect.mjs` reads the world, `phases.mjs` describes the route. The system worked on the person
who built it, which is the only real test of whether it works at all.

### Decisions recorded here because nowhere else holds them

- **"Battle bots" is out.** BattleBots is an actively enforced trademark; the exposure is real and
  far cheaper to avoid now than after a logo exists. "Battle of the Wits" stays — a Princess Bride
  allusion, not a protected mark.
- **Plugin manifests carry no `version`.** The ruleset forbids the release from pushing a bump
  commit, so a committed version could only drift from the tag — silently. Claude Code falls back to
  the commit SHA. Restoring semver would require *both* `@semantic-release/git` and a ruleset bypass
  actor; one without the other is the `GH013` failure that cost a release.
- **The 38 duplicate definitions are architecture, not debt.** Each scanner is a standalone `PATH`
  executable that must not import across that boundary, so `ROOT`/`budget`/`BUDGET_FILE` recur by
  design. Frozen, blocking growth, deliberately not consolidated.

### Left open

Decoupling from `skynet-capital` is half done — the doctrine is single-sourced here now, but the
harness code still sits in both repos, and removing it needs a scope call. Managing `skynet` *from*
the harness needs cross-repo write credentials, which is a blast-radius multiplier and should be
mechanized before it is granted. Coordination — territory claims so parallel athletes stop colliding
— is the next chamber, and the reason more agents do not yet buy more throughput.

---

## 2026-08-01 · The rails, and the last mile that wasn't code

Second half of the same day. The first half made the harness portable; this half made it safe to run
unsupervised. Sixteen PRs total, every one after the first two merged itself on green.

### The order that turned out to be wrong, and the correction

The stated plan was **rails → agents**, with token budget as the lever: *"if we have tokens to burn,
that directly correlates to the speed and amount of work we can ship."*

That is true only until a different constraint binds, and **two bind before tokens do**. Coordination
comes first — athletes that collide produce conflicts and duplicated work, so past that point adding
agents drives throughput *negative*. Review capacity comes second: every athlete PR still spends the
one genuinely scarce resource. So the order became **rails → coordination → agents**, and the
Cartographer chamber stopped being plumbing and became the thing that makes every later chamber pay.

### Four rails, and what each is actually defending

- **Territory claims.** Symmetric overlap, atomic under an `O_EXCL` lock, expiring so a crashed
  athlete cannot hold ground forever — a permanent claim from a dead worker is indistinguishable from
  a live one and silently serialises everything.
- **Blast-radius preflight.** Workflow files, credentials, a *raised* budget, work on the default
  branch. Doctrine was prose, and prose stops a careful reader; an athlete is not a reader.
- **Fleet control.** WIP cap, kill switch, token ceiling. The cap defends **review** capacity, not
  machine capacity.
- **The dispatch bracket.** The three above in one all-or-nothing command, because asking an athlete
  to remember them in order is how a rail gets skipped.

### What testing the refusals bought

Every rail was written, then attacked. Two findings justify the whole practice:

- The preflight was built on `git diff`, which **does not report untracked files** — so it waved
  through the dangerous case, an athlete *creating* `.github/workflows/evil.yml` rather than editing
  one. A rail that looked green while being wide open.
- Every athlete still invoked `node scripts/arch-scan.mjs` — skynet-capital's layout, absent in any
  adopting repo. All four would have died on their first command. Found by reading, without spending
  a dispatch on it.

### The gates kept working on their author

Three PRs today were *shaped* by a gate refusing something I wrote. `phases.mjs` got decomposed
because `--update` refused to raise its own budget. `bootstrap.mjs` got split when it hit 275 lines.
And the doctrine gate — added in the morning to catch dead `${CLAUDE_PLUGIN_ROOT}` references —
caught me writing one into the governor that afternoon.

**Four budget raises, all recorded in the budget files with reasons.** Individually justified; the
*frequency* is the thing worth watching, which is why each one says why in the file rather than only
in a commit message.

### One rule change, deliberately

I renamed four variables in one session purely to satisfy the duplication counter — `args`, `HERE`,
`files`, `argv`. **Four renames is the signal the rule is wrong, not the code.** Ten standalone
`PATH` executables each parse argv and resolve their own root *because they must not import across
that boundary*. So the scanner's `IGNORE` list grew to cover per-CLI scaffolding, narrowly — domain
names stay caught. Duplication debt fell 39 → 31 as a consequence, which is the honest number rather
than a contorted one.

### Left open

The athletes have still never been run — deliberately, on instruction. That remains the only
untested surface, and three of the four unproven things touched today broke on first contact.
Decoupling from `skynet-capital` is half done: doctrine is single-sourced here, but the harness code
still exists in both repos and removing it needs a scope call. Managing skynet *from* the harness
needs cross-repo write credentials, which is the blast-radius multiplier the preflight now exists to
contain — mechanised before granted, in that order.


---

## 2026-08-01 (night) · The Unmapped

**Instruction:** *"keep crawling. I'm going to bed for the next 8 hours."* So the fight was picked by
the tool rather than by a person, which is the first time that has happened here. `harness-dungeon
--today` offered three campaigns and named its own prerequisite: *every other dungeon is a guess
until this one is cleared*.

### What "unmapped" actually meant

The harness ships a gates template that wires **six** dimensions into an adopter's test suite. This
repository ran **three**. Nothing was failing, because nothing was looking.

Each of the three missing gates had a *soft* prerequisite and each degraded politely rather than
loudly — `knip` was never installed, so the dead-code gate skipped; there was no `docs/LESSONS.md`,
so the incident gate had nothing to audit; no budget was ever frozen, so neither had a bar to fail.
Every one of those choices is right in isolation. **The sum was a blind spot with no owner.** Nobody
decided to run three gates; three is simply what happened when six polite skips met nobody counting.

That is the shape worth remembering: *graceful degradation without a census is indistinguishable
from coverage.* The fix is not "make the gates loud" — a gate that fails because a repo hasn't
installed an optional tool is a bad neighbour. The fix is that something must **count the promise
against the practice**, which is now a test: the shipped template's gate list is parsed and every
gate in it must appear in this repository's suite. Scoped by category, not enumeration — a seventh
gate cannot be forgotten here, because forgetting it fails.

### The number that was wrong in the comfortable direction

Bringing the spec-gap gate online produced **24 untested files of 24** — in a repository with 81
tests that drive those exact files end to end. The gate counted only one relationship: *does a spec
`import` this module?* For a library that is the whole story. For a codebase whose deliverable is a
set of **commands**, it is close to a lie.

The tempting fix was `specExempt` — declare CLI mains unexemptable-from and move on. That would have
been exempting 24 of 24, i.e. deleting the gate while appearing to configure it. The descriptor doc
already warns about exactly this, in writing, and it was still the first idea.

What landed instead teaches the gate the second relationship. A thin launcher under a `bin/`
directory whose body names a module is an **alias** for that module; a spec that runs
`harness-arch-scan` really does execute `lib/arch-scan.mjs`. The mapping is derived from the
launcher's own text rather than declared in config, so there is nothing to keep in sync. Honest
number: **10 untested of 23**, frozen there.

A wrong number in the *failing* direction gets fixed within the hour, because it blocks someone. A
wrong number in the *passing* direction survives indefinitely — and its real cost is not the one bad
measurement, it is that it makes the honest reading of every other gate suspect.

### Four bugs the act of measuring found

Turning on measurement is never just turning on measurement:

- The clone gate had **no `.jscpd.json` at all** — its own header comment claimed one. It had been
  scanning `package-lock.json` and the docs tree for months. Installing one dev dependency pushed it
  over budget and that is the only reason anyone looked. Honest debt after scoping: 16 → **10**.
- The spec-gap gate ignored the `exclude` descriptor key that `arch-scan` and `dupe-scan` both read,
  so it scored shipped **templates** as untested product code. Two readers of a documented key out of
  five is not a convention, it is drift.
- `harness-incident-scan` read `docs/LESSONS.md` unguarded and would have crashed on any repository
  that had not adopted the ledger — the exact first-run moment a gate must not fail.
- `harness-arch-scan --update` **silently deleted the prose** explaining a deliberate budget raise.
  The number survived; the reasoning did not. Nothing failed, and nothing would have. Now `_`-prefixed
  keys carry through, with a test that ratchets a throwaway budget and checks the note survives.

None of these were the dungeon. All of them were found by walking into it.

### The gates refused their author four times, again

`spec-gap-scan`, `incident-scan`, and `arch-scan` all went over their line budgets because of the
comments explaining these fixes. Each one was answered by *cutting stale prose from the same file* —
usage blocks still telling readers to run `node scripts/arch-scan.mjs`, a path that stopped existing
when the harness became a plugin — rather than by raising a budget. Three files ended smaller and
more accurate, and no budget moved up. That is the ratchet working as designed: the pressure is
supposed to be uncomfortable, and the discomfort is supposed to be productive.

### Left open

Still no athlete has ever been dispatched. Decoupling from `skynet-capital` still waits on a scope
call. And a new one: the bootstrap's `knip.json` and `.jscpd.json` templates hardcode `src` and
`.spec.ts` — the identical assumption that made the scanners measure 1 file of 10 in this repository.
The scanners were fixed; the configs they depend on were not. Same bug, one layer down.

---

## 2026-08-01 (night, later) · The Cartographer's Error

Left open at the end of the previous dungeon, and picked up immediately because it is the same bug
one layer down.

Every scanner in this harness reads its paths from `harness.json`. That was the whole portability
fix, and it was declared done. But two of the six gates — dead code and clones — don't do their own
detection; they delegate to `knip` and `jscpd`, whose scope lives in a **config file**. Those two
files were still copied verbatim from the repository the harness grew in, hardcoding `src` and
`.spec.ts`.

So an adopter with a `lib/` layout would have gotten scanners looking in exactly the right place and
detectors looking in exactly the wrong one. Not an error — an **empty scope**, which produces no
findings, which reads as a clean repository. The most expensive kind of wrong answer, again, and for
the second time in one night.

**The generalisable question**, which is now in the ledger: after any portability fix, ask *what does
the fixed thing read, and was that fixed too?* "Made the scanners descriptor-aware" felt complete
because the scanners were the thing that had been named. Naming is not scope.

Both configs are now rendered from the descriptor rather than copied, and the two template files are
deleted — a template that must stay in sync with a renderer is a second source of truth waiting to
drift. The gate is an end-to-end one: run the one-shot in a `lib/`-and-`spec/` repository and assert
that **no emitted config contains the string `src/`**. That phrasing is deliberate. Asserting the
right paths appear would pass on a config that also carried the wrong ones.

### A note on what this repo's own configs look like

This repository's `knip.json` enumerates its entry points explicitly rather than matching the
generated shape, because its launcher-backed modules are genuinely unusual. That is a legitimate
divergence — but it does mean the harness is not eating exactly what it cooks here, and a future
reader should not take the committed file as the reference output. `configs.mjs` is the reference.

---

## 2026-08-01 (night, third) · The Mirror Halls

The duplication gate had been reporting the same finding for months, and it was right every time:
**32 duplicated definitions**, six scanners each carrying their own copy of the descriptor, the
budget file, the tree walk, and the repo-relative path helper.

It survived because it had a defence, written into the duplication scanner itself:

> nine standalone PATH executables each parse argv and resolve their own root **because they must not
> import across that boundary**

That reads like architecture. It is also false, and it had already been falsified in the same
directory: `harness-claim` is launched from a `bin/` wrapper and imports `registry.mjs`, and has
since the day it was written. A launcher runs `node lib/<x>.mjs`; from there a sibling import is an
ordinary relative specifier. There is no boundary. There was a plausible-sounding reason nobody spent
sixty seconds testing.

**The thing worth carrying forward:** a gate can be argued *out* of a finding as easily as into one,
and the argument that wins is the one that sounds like architecture. The gate was never wrong. The
comment was.

And the copies were not free. `spec-gap-scan` ignoring the `exclude` key that `arch-scan` and
`dupe-scan` both honoured — the bug found two dungeons ago — is precisely what six copies of one
preamble produce: a fix applied to some of them.

Debt after: duplication **32 → 25**, clones **10 → 4**, and every scanner got shorter.

### The part that only happened because of a manual step

Halfway through, `harness-dupe-scan --update` died with a ReferenceError — a missing import on the
write path — **seconds after a 108-passing test run said everything was fine.**

Every gate case invoked the report path. Nothing anywhere exercised `--update`, which is the command
a person runs immediately after a cleanup, at the exact moment they most need the tool to work. Six
cases now run each scanner's `--update` in a throwaway repo.

A suite that covers one of two code paths reports the confidence of a suite that covers both. That is
the third variant of the same lesson in one night: **an unmeasured dimension is not a passing grade**
— gates that were never wired, a config nobody scoped, and now a command nobody ran.

Next obvious sweep: `--candidate` has no case either, and it is what every athlete calls to pick its
target. An athlete has still never been dispatched, so nothing has noticed.

---

## 2026-08-01 (night, fourth) · The Candidate's Path

Flagged at the end of the last dungeon as the obvious next sweep, and it turned out to be the most
consequential one of the night — because it is the surface that decides whether the athletes work at
all, and it had never been run.

`--candidate` is the **machine interface**. It is the first command every athlete executes
(`harness-arch-scan --candidate` → take `candidate.file`) and the first the governor runs when it
dispatches one. It was never specified. It was implemented six times, and the six disagreed.

The worst of them: `harness-incident-scan --candidate` printed a bare diagnostic line and **no JSON
at all** whenever it had no token or no network — which, offline, is always. And when it did work it
emitted the raw run object rather than `{candidate: …}`, so `/retro` reading `.candidate` would have
gotten `undefined` either way.

Nothing downstream is defensive, and that is not an oversight to fix downstream. An athlete is a
language model following an instruction file, not code with a try/catch. A stray log line on stdout
kills it on its first command, before it has claimed territory or opened anything.

**The contract, now written into `DISPATCH.md` and asserted for all six gates:** exit 0, exactly one
JSON object on stdout, a `candidate` key that is an object or `null`, diagnostics to stderr. `null`
means *stand down*; it never means the command failed.

Asserted in two conditions, and the second is the one that matters: a repo with real debt, and a
**bare repo nothing can measure**. A gate that cannot find a target must still answer in the shape
the caller was promised.

### Four retros, one lesson

The pattern across tonight is now unmistakable, and it is worth stating in its general form:

> **A surface nothing exercises reports the confidence of one that is exercised.**

- Three gates were shipped but never wired into the suite — nothing failed, because nothing looked.
- Two config files were never scoped to the repo — an empty scope reads as a clean codebase.
- `--update` was never run by any test — it crashed seconds after 108 tests passed.
- `--candidate` was never called by anything — and it is the athletes' first command.

Each one was individually invisible and collectively obvious. The useful question, asked of anything
before its first real use: **what has actually run this?** Not "does it look right." Not "is it
covered by the suite." What has run *this path*, in *this condition*.

### Still standing

An athlete has still never been dispatched. That was the right call while its first command was
broken — and it is now, for the first time, a thing that could be tried rather than a thing that
would have failed silently. Still Eric's call to make.

---

## 2026-08-01 (night, fifth) · The Foundry

Followed the tool's own recommendation this time — `harness-dungeon --today` named The Foundry, with
`bootstrap.mjs` at 238 lines as the target. That is the pilot loop working as designed: *what should
I build today?* answered by measured state rather than by a person.

Two seams, both cohesive rather than convenient:

- **`mergeClaudeSettings` → `merge.mjs`**, which already owns "fold into a file the project owns
  without trampling it." `settings.json` carries **hooks**, which are code execution — rewriting it
  wholesale would be the single most destructive thing the bootstrap could do, so it belongs with the
  two other merges that follow the same rule.
- **`gateSpecFor` → `detect.mjs`**, which already owns "what has actually been done here?" Choosing a
  gate spec by reading the repo's test runner is repo-state detection, not writing.

`bootstrap.mjs`: **238 → 209**.

### The rail said no, and it was right

Both receiving modules had to grow to accept the code — `merge.mjs` 69 → 101, `detect.mjs` 59 → 80 —
and `harness-preflight` refused the change outright:

> a budget may only be lowered; raising one is marking your own homework

That refusal is correct and should not be weakened. But it means something specific and worth naming:
**the decomposer athlete structurally cannot perform an extraction into an existing module.** It can
only ever split into brand-new files. Every "move this into the module that should already own it"
refactor is, by construction, a lead-level change.

That is a real limit of the current rails, not a bug to patch tonight — and the wrong fix is obvious
and tempting: let an athlete raise a budget when something else falls. A net-sum rule sounds
principled and would have failed here anyway, because the extraction added explanatory comments in
its new homes and the *total* line count genuinely rose. The honest accounting is that this change
costs lines and buys placement.

So the fix that landed is a **doctrine** one: `decomposer.md` now says extract into a new file, and if
the natural home already exists, say so and stop. Better a dispatch that reports "this needs a human"
in ten seconds than one that burns its whole run producing a diff the bracket will refuse.

Preflight is not wired into CI — it is the athlete's self-check inside the dispatch bracket — so this
PR is unaffected by its own finding. The raise is recorded in `arch-budget.json` with the reasoning,
which is the mechanism built two dungeons ago for exactly this.

### One more stale reference

The extraction left a template literal in the summary still reading `usesNodeTest`, a variable that
had just moved. It crashed on `--dry-run`. Caught by running the tool rather than by the suite — the
`--dry-run` path *is* covered, but the crash was in the summary printed after it. Same night, fifth
instance: **what has actually run this?**
## 2026-08-01 (night, sixth) · The Last Mile

`--candidate` is the athlete's first command. `harness-ship` is its last, and it had never been run
by anything either.

It was lifted verbatim out of the repository the harness grew in, and it showed. At runtime it
invoked **`node scripts/incident-scan.mjs`** — a path that exists in no adopter's repo. It told the
caller to read `.claude/skills/ship/SKILL.md`, which an install does not have. Its usage line named
`scripts/ship.sh`, a file that has not existed since the harness became a plugin. Its User-Agent
still said `skynet-ship`.

Every scanner had the same defect in its fix-it message — *"Then `node scripts/dupe-scan.mjs
--update` to ratchet the budget down"* — printed at precisely the moment an adopter is looking for
instructions. Two athlete instruction files pointed at in-repo skill paths.

### The enumerated sweep is the actual lesson

The athletes were repointed at `harness-*` commands weeks ago. That fix was real and it worked. It
was also **a list**, and everything not on the list survived — still reading as authoritative,
because a wrong instruction and a right one look identical to someone who does not already know.

Both gates that have caught real drift here are scoped by *category*, not by enumeration: the
doctrine test (every `${CLAUDE_PLUGIN_ROOT}` reference in every shipped file must resolve inside the
plugin that makes it) and now this one (no shipped file may name `node scripts/*.mjs`,
`scripts/ship.sh`, or `.claude/skills/*`). Both caught things their authors had not thought of. That
is the whole difference: an enumerated fix ends; a category gate keeps working.

### Negative control

The new gate was verified by **reintroducing the offence and watching it fail**, then reverting. A
gate nobody has seen refuse is a gate nobody knows works — and the `git checkout` used to revert the
deliberate offence also silently reverted a real fix in the same file, which is its own small lesson
about using version control as an undo button mid-experiment. Caught immediately by re-reading.

`harness-ship` also gained six cases pinning its refusals: no token, no subcommand, no title, base
into itself, dirty tree, merge with no number. Opening a real PR cannot be tested here; every refusal
that fires *before* anything irreversible happens can be, and those are the ones that protect an
athlete.

### The check that only existed in CI

The PR then went red on **shellcheck**, from the same sweep: a skill reference rewritten into
backticks inside a double-quoted shell string, which is command substitution.

`npm test` was green. Shellcheck was installed on this machine the whole time — it just was not part
of the project's own command, only of CI. So a 200ms check became a commit-push-wait cycle.

It now runs in the suite. The general rule, worth more than the fix: **every check CI runs should be
runnable by the project's own command.** A step that exists only in CI does not make verification
stricter, it makes it slower — and the wait is where people quietly stop verifying.

### Banked, not fixed

`ENGINEERING.md` ships inside `harness-core` and still describes **skynet-capital**: hooks at
`.claude/hooks/skynet-tdd-postedit.sh`, valuation math in `src/domain/portfolio.ts`, risk in
`src/engine/guards.ts`, a directory tree that is one specific app's. An adopter reads it as doctrine
about their own repo. That is a genuine finding and a bigger job than this dungeon — the next one.

---

## 2026-08-01 (night, seventh) · The Borrowed Map

Banked at the end of the last dungeon, and worse on a full read than it looked.

`ENGINEERING.md` ships inside `harness-core` — an adopter installs the plugin and gets it on disk as
**doctrine about their own repository**. What it actually described was one specific application:
hooks named `skynet-tdd-postedit.sh`, valuation math in `src/domain/portfolio.ts`, risk in
`src/engine/guards.ts`, a `personas/` directory, an Alpaca adapter, an entire section weighing Redux
Toolkit for a dashboard nobody else has. Three of its relative links pointed at files that exist in
exactly one repository on earth.

### Promotion by relocation

The doc was written as the engineering standard **of** an application and later promoted to portable
doctrine **by moving it**. That changes where a file lives and nothing about what it claims.

It is a tidy general shape, and it is not obvious in the moment: moving an artifact into a portable
home does not make it portable. The useful question is what the moved thing *claims*, not where it
now sits. Every rule here was stated through one project's nouns, so an adopter could not tell which
parts were the rule and which were that project's illustration of it — and illustrations read as
instructions when you do not yet know the difference.

### What the rewrite kept, and what it cut

Kept, because they are genuinely portable and were only *phrased* locally: ADRs gated on
reversibility rather than size; strict-compiler-as-first-test; TDD/BDD with the "never assert
internals" rule; EARS with its mechanical mapping to specs; DRY-as-one-owner-per-concept;
no-junk-drawer decomposition; interfaces at the boundary; and the whole change-communication
section, which was already written for a general reader.

Cut, because they are one application's decisions and belong in that application's repo (where they
still live): the stack table, the Redux deliberation, the component-library plan, and the
`OrderIntent`/broker examples.

Two rules gained something in translation. **Interfaces at the boundary** now carries its practical
test — *if swapping a vendor means editing files that have nothing to do with that vendor, the
boundary is in the wrong place.* And **DRY** now states what the duplication gate cannot do: it can
be argued out of a finding as easily as into one, which is the lesson from The Mirror Halls, now
written where the next reader will meet it.

### The mechanical half is now a gate

Dead links were the part a machine can own: every relative link in a shipped doc must resolve inside
the plugin that ships it. Absolute URLs pass, because pointing at something outside the plugin is
exactly what a URL is for — and a repository-only doc is outside the plugin by definition.

Third category gate in this repository, and the third one to catch something on its first run.

### A merge conflict, and the reason for it

`#23` went `mergeable_state: dirty` and never ran CI — it was cut from `main` while `#22` was still
in flight, and both appended to `JOURNAL.md`. Resolved by keeping both entries in the order the
dungeons actually happened, which is the only sane resolution for an append-only file.

The real fix is sequencing: cut each dungeon's branch from `main` *after* the previous one merges.
That has been the pattern all night and it worked six times; the one departure produced the one
conflict. Worth stating plainly because the temptation to parallelise is strongest exactly when
things are going well.

---

## 2026-08-01 (night, eighth) · The Stale Map

Found by being refused. `harness-preflight` rejected a change for raising two budgets that had
already been raised — in a reviewed PR, merged to `main`, hours earlier. The gate was comparing
against a **local `main`** that had not been fetched since before that merge.

`defaultBranch()` resolved `origin/HEAD`, stripped the `origin/` prefix, and used the result for two
different jobs. But they are two different questions:

- **the name** answers *am I working on the default branch?*
- **the ref** answers *what is this diff taken against?*

Answering the second with the first means every comparison runs against whatever the local branch
happens to be — and an athlete's worktree, which fetches once and then works, is exactly where that
goes stale.

### The asymmetry is the point

A stale base **invents** violations that are not there: noisy, and self-correcting, because someone
investigates. A stale base also **hides** violations that are: silent, and a false clear from the
gate that guards workflow files, credentials, and budget raises.

Tonight's recurring lesson has been *a surface nothing exercises reports the confidence of one that
is exercised.* This is its sharper cousin: **a check against the wrong reference reports the
confidence of a check against the right one.** Same shape — the number looks fine, and nothing about
it advertises which question it answered.

### What landed

The two values are now separate, the ref prefers `origin/<name>` when it resolves, and both git
helpers moved into `gitscope.mjs` — a **new** file, deliberately, because the extraction that grows
an existing module is the one an athlete structurally cannot perform (the finding from The Foundry).
Doing it the way the rails allow keeps this move inside what a decomposer could have done.

That extraction also paid for itself immediately: `preflight.mjs` fell 165 → 118, and both helpers
are now testable **by import** rather than only through the executable that uses them. Seven new
cases, including the untracked-file case that had been provable only end to end.

Verified by **negative control** — the new case fails against the old implementation, then passes.
Second time tonight that has been worth doing, and both times the gate was one I had just written.

The extraction also collided a helper named `run` with `auto.mjs`'s, which the duplication gate
caught in the same run. Renamed to `gitOut`, which is the better name anyway — the rename is
descriptive, not a concession to the counter.

---

## 2026-08-01 (night, ninth) · The Rehearsal

The side quest banked two dungeons ago: shellcheck ran only in CI, so a typo that a locally-installed
tool would have caught in 200ms cost a push, a runner, and a red PR.

The narrow fix landed then. The general rule is the dungeon: **every check CI runs should be
reachable from the project's own command.** A step that exists only in CI does not make verification
stricter, it makes it *slower* — and the wait is where people quietly stop verifying.

So there is now one `npm run verify` that runs what CI runs, a `npm run commitlint` for the range
check, and a gate that reads the workflow and asserts every command in the `verify` job is reachable
locally — or declares itself CI-only in an allow-list **with a reason**, so the exceptions stay few
and visible rather than accumulating unread.

### The gate was the bug

It passed on its first run. Then the negative control — pull the shellcheck entry out of the
allow-list, expect a refusal — **stayed green**.

The parser matched `run:` on a single line. A `run: |` block puts its commands on the *following*
lines, which is exactly where shellcheck and the CLI validator live. So every multi-line step
contributed nothing and the gate reported a clean sweep of a set it could not see.

A gate written specifically to stop *"a dimension nobody measures"* was one. That is the whole night
in a single artifact, and it is worth saying plainly rather than quietly fixing: **the failure mode
does not spare the person who has spent all night naming it.**

It now consumes block bodies by indentation and carries a self-check — if it cannot find the
shellcheck step at all, it fails rather than passing, because a parser that finds nothing looks
identical to a repository with nothing wrong.

### Nine dungeons, one lesson, nine costumes

- gates shipped but never wired into the suite
- config files never scoped, so the detectors measured an empty directory
- `--update` never run by any test — it crashed seconds after 108 passed
- `--candidate` never called, and it is the athletes' first command
- `harness-ship` never run, and it is their last
- doctrine that shipped describing a different repository
- a blast-radius check measured against a branch that may not be current
- and a parity gate that parsed nothing and said everything was fine

Each was invisible on its own. The general form, now stated in the ledger as many times as it has
been earned: **a surface nothing exercises reports the confidence of one that is exercised.** The
question that finds them is not "does this look right" — it is *what has actually run this?*

---

## 2026-08-01 (night, tenth) · The Mirror Halls, Second Pass

The duplication gate had been carrying 25 for a while, and 15 of it was **the consolidation itself**.

After six scanners stopped each owning a copy of the descriptor preamble, what they each write now is
a binding:

```js
const DESC = descriptor(ROOT);
const budget = readBudget(ROOT, "arch", {});
const rel = (f) => relTo(ROOT, f);
```

The gate's signal is *the same top-level name declared in N files*, a proxy for *the same
implementation pasted N times*. A binding satisfies the proxy while being the exact opposite of what
the proxy is for — the implementation lives in one place, which is the thing DRY was asking for.

Left alone, the gate **punishes the fix and rewards leaving the copies**. That is worse than a noisy
number; it is a number pointing the wrong way.

### The tempting fix was the banked mistake

Rename the twenty symbols. It works, it is fast, and this repository already banked the lesson at
*four* renames: the gate distorting the codebase. At twenty it is not a judgment call.

So the counter got fixed instead — but with a constraint that matters more than the change. **A rule
that stops counting things can be talked into stopping counting the things that matter.** The
discipline is that the new rule is a claim about *structure*, checkable from source:

> a `const` whose initializer's only call is to a symbol imported into that same file is a binding

Paste a function body and its initializer is not an imported call — it is the body. `function` and
`class` are always definitions, no exceptions, because that is where pasted code actually lives. An
arrow that composes two calls is doing work of its own and stays counted.

Twelve cases, and most of them are the adversarial half: a pasted body with imports in the file, an
arrow composing two imported calls, a const calling a *local* function, a class extending an imported
base. The rule has to fail those, and it does.

**Not a suppression list.** A list is a claim about names, and a list can be extended to excuse
anything — and eventually is. This stops applying the moment the code stops being a binding.

Debt 25 → 10, and the ten that remain are real: `descriptor`, `release`, `render`, `violations`,
`cap`, `debt`, `files`. Those are worth looking at on their merits.

---

## 2026-08-01 (night, eleventh) · The Untrodden

The audit question, applied mechanically this time: *which shipped launcher does no test reference at
all?* Fourteen commands, one answer — **`harness-map`**, zero.

It ran. It produced a file. The file opened in a browser. And it had **no doctype**, so every browser
opened it in quirks mode, where box-sizing and several inherited properties behave differently from
the standards mode its CSS was written against. It rendered. It just did not render as designed, and
"it opens" was never the claim being made.

The cause is the same family as everything else this week: the renderer returns page *content* —
`<title>`, `<style>`, then markup — which is exactly right for an embedding host that supplies its
own skeleton. **A file on disk has no host.** An artifact correct where it was authored, moved
somewhere that needs more, with nothing in between to notice.

Two smaller things fell out of running it once:

- The title said **`botw-cartographer`** — the name of the worktree directory, not the repository.
  A file people share should not be titled after somebody's scratch checkout.
- It wrote `dungeon-map.html` into the repo root, **untracked**. A read-only tool that dirties the
  tree is a tool an athlete's preflight will then count as part of its change. Now gitignored here
  and in the shipped template.

Six cases: the doctype and every required tag, standalone-ness (no external stylesheet, script,
font, or image — the promise the file makes), HTML-escaping of ADR titles, a repository with no ADRs
at all, and the `-o` path.

### The fixture that transcribed what it was testing

Adding one line to the shipped `.gitignore` template turned a bootstrap case red. The case had
hand-written a `.gitignore` matching the template's contents, so it was asserting on **the
transcription**, not on the behaviour it named ("a repo that already covers the harness's needs is
left alone").

A copied fixture is a second source of truth, and it goes stale in the direction that matters: it
would equally have kept passing while covering the wrong set. It now reads the shipped template.

The enumeration-versus-category lesson, which has been the spine of the last four dungeons, turns out
to apply to fixtures too.

### Two budgets raised, deliberately

`cartography.mjs` 172 → 190 and `map.mjs` 24 → 33. Both are new behaviour — a document skeleton, and
resolving the repository's real name — not accumulated sludge, and the prose in both files was cut
first. Recorded in `arch-budget.json` with the reasoning, including the instruction not to recover
the lines by dropping the skeleton: a fragment written to disk is a quirks-mode document.

As in The Foundry, `harness-preflight` refuses this change, correctly, because an athlete may never
raise a budget. It is a lead-level change and it lands as a reviewed PR. That distinction is now
appearing often enough to be a real feature of the system rather than an edge case.

---

## 2026-08-01 (night, twelfth) · The First Run

`harness-bootstrap --auto` is the adopter's **entire first experience** — Eric's "everything must be
automated" path — and nothing had ever run it end to end.

The first run, in a throwaway repo, took about four seconds and produced the finding immediately:

```
✓ commit  —  chore: adopt the engineering harness
--- branch ---
main
```

It commits to the default branch. Three lines later, the handover it prints tells the adopter to
enable a ruleset requiring pull requests. So the adoption commit ends up stranded on a branch that
can no longer be pushed — and `harness-preflight`, installed by that same run, refuses precisely
this shape.

**The harness composed a deadlock with itself.** Third instance of that pattern this week (the
semantic-release bump, the all-branches ruleset), and the first where both halves were ours.

Reading the code would not have found it. The commit step looks unremarkable in isolation; it is only
wrong in sequence with a paragraph printed a few lines later. That is what running a thing gets you
that reviewing it does not.

### A tool that breaks its own rules on day one

The deeper cost is not the stranded commit — it is what the adopter learns. Day one is the only day
they are paying full attention, and on day one the tool demonstrates that its own doctrine is
optional. Everything after that is negotiation.

Now it creates `chore/adopt-the-harness` before committing, leaves an adopter already on a feature
branch where they are, and — the part that matters as much — **says that preflight will refuse the
adoption commit by design**, because adoption is the one change that legitimately writes
`.github/workflows/` and `.claude/settings.json`. An expected refusal that nobody warned you about
reads as a bug, and a bug on day one is uninstalled by lunch.

### Seven cases, and a helper the clone gate asked for

The branch, the grandfather step, the honestly-unlit dimension (knip is absent in a bare repo, so
no `dead-budget.json` is written rather than a fabricated clean bill of health), never pushing
unasked, the handover naming the credentialed steps, and re-running without clobbering.

They use a repo with **no `package.json`** on purpose, so `npm install` and `npm run verify` are
skipped and the adoption *sequence* is what is under test rather than a package manager.

The clone gate immediately caught the new `gitRepo()` fixture duplicating `gitscope.test.mjs`'s —
now `makeGitRepo()` in `helpers.mjs`, which also documents the deliberate case: given `{}` it leaves
the repository **unborn**, because that is a real state a tool meets and several cases exist to prove
nothing crashes there.

---

## 2026-08-01 (night, thirteenth) · The Watchtower

Continuing the audit, and this one is the sharpest version of it: **the status line runs on every
single render in an adopter's editor**, and nothing had ever executed it.

It sits in `templates/`, which every gate deliberately excludes — a template is not this project's
code, and measuring it inflates every number. That exclusion is correct for the scanners. It was also
quietly doing something else: **"not measured" had become "fine."**

Running it once found two things.

### A progress bar that can never fill

The row reads `depth N/5`. The depth it computes maxes out at **3**, because phases 4 and 5 are
*repository settings* — requiring `verify` on the default branch, and enabling auto-merge — which a
row that reads files cannot see and must not make a network call to find out.

So a repository that has done everything right displays `depth 3/5 · The Warden's Gate` forever. The
indicator is accurate about what it measured and misleading about what it means, which is the worse
combination: it tells a diligent adopter, permanently, that they are not finished.

It now names the wall — `· rest is repo settings` — at exactly the depth where the code runs out and
the settings begin. An honest ceiling is more useful than an unreachable one.

### The failure the try/catch could not catch

`readFileSync(0)` on a TTY reads until EOF. That is a **hang**, not a throw — so the file's careful
"never fail loudly, swallow everything" contract, which is the right contract, could not have saved
it. Silence is the correct failure mode for a status line; freezing the row is not a failure mode at
all, it is a hostage situation. It now reads stdin only when something is actually piped.

### The general shape

An exclusion is a statement about **who measures**, never about whether something matters. The
scanners were right to skip `templates/`. Nothing was right to conclude from that skip that the most
frequently executed file in the whole distribution was fine.

Worth a sweep of anything else excluded on principle — fixtures, generated output — for the same
silent promotion from *out of scope* to *assumed good*.

---

## 2026-08-01 (night, fourteenth) · The Gatehouse

The previous retro said to sweep whatever else was excluded on principle. The first stop was the
`husky/` templates — the git hooks the harness installs into an adopter's repository, which then run
**on every commit and every push they ever make**.

Nothing had ever checked them. CI shellchecks `plugins/*/bin/*`: every launcher, and no hook.

Running shellcheck on them for the first time found a real one, in `pre-commit`:

```sh
files=$(git diff --cached --name-only --diff-filter=ACMR)
./node_modules/.bin/biome format --write $files
git add $files
```

`$files` is a newline-joined list, and unquoted expansion splits on **spaces** too. Stage a file
called `release notes.md` and it becomes two arguments: formatting silently skips it, and `git add`
is handed two paths that do not exist.

It is the kind of defect that only appears the first time somebody has a space in a filename, which
is precisely the day nobody is looking for it. Now NUL-delimited through `xargs -0`, with an
end-to-end case that stages exactly that filename — and verified by a negative control against the
old implementation, because a case that has never been seen to fail proves nothing.

None of the three hooks carried a shebang either, so shellcheck could not reason about them even if
someone had pointed it at them.

### A glob is an enumeration wearing a wildcard

That is the sentence worth keeping. `plugins/*/bin/*` looks like a rule and behaves like a list: it
covers exactly what its author had in mind at the moment they typed it, and everything added later in
a different directory is silently out of scope while looking covered.

Second enumeration to fail this week — the first was the athletes' command paths, repointed by a
sweep that fixed everything it looked at and taught nothing. When the intent is "everything of kind
X", **derive** the list and then assert the derivation actually found the kinds you expect. The
shellcheck case now asserts the hooks are in scope, so the coverage cannot narrow again without
failing.

CI's own glob is untouched — workflow files stay the human carve-out — but it no longer matters:
`npm run verify` covers strictly more than the workflow does, which is what The Rehearsal was for.

---

## 2026-08-01 (night, fifteenth) · The Armoury

Third stop in the templates sweep, and the directory keeps paying.

`templates/common/claude/settings.json` was **never read by anything**. It also shipped a hooks entry
running `.claude/hooks/intent-log.mjs` — a script this harness does not write. The `|| true` on the
end meant it would have failed silently in every adopter's editor, forever, while an adopter reading
the file would reasonably conclude there was an intent log.

Dead code that the dead-code gate structurally cannot see, because `templates/` is excluded from
knip — correctly. A template is source-shaped and is not this project's code; measuring it inflates
every number and reports two deliberate variants of one file as duplication.

**Second retro in a row where the finding was inside an exclusion.** The sentence that generalises:
an exclusion *moves* responsibility, it does not remove it. Whatever is out of scope for the general
gates needs a specific one, or it needs to not ship.

### Deriving reachability from the loader

The obvious gate — "every template must be written by the bootstrap" — needs a list of what the
bootstrap writes, and a list would be maintained by the same person who just forgot to wire a
template in.

So it reads the loader's own `tpl(...)` calls, including the one that is a template literal
(`tpl(\`husky/${hook}\`)` contributes the prefix `husky/`), plus any template path appearing as a
string literal in lib — which is how `gateSpecFor` hands its choice to `tpl()`. Derived, not
transcribed, in a directory where a transcription would go stale precisely when it mattered.

Verified by putting the dead file back and watching two gates fail.

### The fork nothing was watching

`gates.spec.ts` and `gates.test.mjs` each list the six gates independently, and the bootstrap picks
between them by detecting the adopter's test runner.

Add a seventh gate to one and not the other, and **half of all adopters silently lose that
dimension** — with the half selected by a property of their toolchain, which is the last thing
anyone would think to check when a gate appears to be missing.

They now have to agree, with a self-check that the parse found at least six gates, so a broken parse
fails loudly rather than cheerfully agreeing that both templates are empty. That trick is becoming a
habit worth naming: **every gate that counts things should assert it counted something.** The parity
gate two dungeons ago passed by parsing nothing, and this one could have passed the same way.

---

## 2026-08-01 (night, sixteenth) · The Second Home

The README has said it from the start, and it was the most honest line in the repository:

> this has been proven in exactly one codebase … treat "portable" as a claim rather than a fact.

So: a throwaway JavaScript project — `lib/`, `spec/`, `.js`, no TypeScript, a suite that globs
`spec/**/*.test.js`. Adopt into it and watch.

**Four defects in under a minute**, none of which any existing test could see.

1. The scripts table hardcoded `typecheck: tsc -p tsconfig.json --noEmit`, and a `verify` that ran
   it. The adopter's very first verify failed **on a file they do not have, for a language they do
   not use, in a script the harness had written for them sixty seconds earlier.** That is the
   grandfather-step failure one layer up: go red immediately for something nobody caused, and the
   whole process is switched off before it has proved anything.
2. The gate spec template called `assert.fail` outside a test callback and had unsorted imports —
   both flagged by **the linter the harness itself installs**. A bootstrap that writes a file its own
   verify then rejects has a very short window of credibility.
3. Three more written files failed that same formatter.
4. And the worst one. The gate file was named `gates.test.mjs` in a repo whose suite globs
   `spec/**/*.test.js`. **It was never collected.** Seven gates reporting nothing, a green suite, and
   a repository that believes it is guarded.

That fourth one is the exact lesson banked on the first day of this repository's life — *a gate file
the runner never discovers is worse than a gate that fails* — recurring in a new costume, because the
detection answered **which runner** and treated that as also answering **which glob**. They are two
questions. One check was answering both.

### The fix for one trap walked into another

`gateSpecFor` read `harness.json` from disk. By the time it runs, the bootstrap has already written
the **default** `harness.json` from its own template — so it named the gate file after an opinion the
repo never expressed. The descriptor had been read into memory earlier for exactly this reason, in a
previous dungeon, and I re-read it from disk anyway.

Whenever a tool both writes a file and reads it, say which copy is authoritative. It is now passed in.

### What the harness got right

Worth recording, because a list of four defects reads worse than the run actually was. Everything
else worked, in a repo shaped nothing like this one: budgets frozen against `lib/` with `.js`, the
duplication gate finding a genuinely copy-pasted `subtotal` across two modules, dead code finding an
unused export, the spec gap counting the two untested files correctly, and the adoption landing on
its own branch. After the four fixes, the JavaScript repo's suite runs **seven gates, all green**.

The claim in the README is now one repository closer to being a fact. It is still a claim.

---

## 2026-08-01 · The City — rung two of the visual ladder

Eric asked for a progressive skillset toward high-quality graphics, "starting with 2d overviews of
the systems, like sim city style", and separately for ADRs and dungeons to be **navigable** — because
"high quality pictures, graphs and charts have more headroom on synthesizing information quickly for
humans."

Rung one already existed and nobody had noticed: `harness-map` is a 2D system overview. So rung two
is `harness-city` — the codebase as an isometric town. Districts are top-level directories, buildings
are files, height is line count, colour is standing against the committed budget.

### What the picture is for

A list of thirty files sorted by line count is thirty facts you have to hold. A skyline is one image:
the tall things are tall, the districts are visibly uneven, and a red tower is somewhere *specific*
rather than somewhere on page two. That is the whole claim, and it either survives contact with a
real repository or the rung was decoration.

It survives. Rendered against a synthetic project with two over-budget modules, the two red towers
are the first thing the eye lands on, before any number has been read.

### Four passes to make it legible, none of them optional

The first render was **flat** — technically correct and visually useless:

1. **Linear height scaling crushed the middle.** With one 200-line module in the city, a 60-line file
   drew at 30% and everything below it collapsed into an indistinguishable plate. Square-root scaling
   spreads the range where files actually live. Ordering is preserved exactly; the true count is in
   the tooltip.
2. **A box is not a building.** Adding lit floor bands gave the height a *unit* — without them a
   tower and a cottage read as "two boxes", which is precisely the comparison the rung exists to
   make.
3. **The SVG was stretched to fill its container**, which blew 13px plaque type up to headline size
   sitting on the skyline. Natural width, never stretched.
4. **The plaques collided.** Anchored per-district they overlapped; on a shared baseline they still
   overlapped, because the names carried the statistics too. The fix was information design rather
   than layout: **the picture carries the shape, a table carries the numbers.** Which is Eric's point
   restated — pictures synthesise, but numbers belong where they can be read.

Each of those was found by *looking at it*. None would have been found by reading the code, and the
tests would have passed at every stage.

### The gate caught the ladder's own founding rule being broken

The duplication and clone gates went red in the very change whose purpose was to stop two pictures of
one repository disagreeing. The new view needed the ADR list, the escaper, the argument parse — all
of which lived inside the first view — and copying takes ten seconds while the drift takes months to
surface.

So the thing that was *declared* got built: `model.mjs` derives the repository once, and
`cartography.mjs` now consumes it instead of parsing `docs/adr` a second time. `render.mjs` holds the
plumbing both views share.

**Views may share their plumbing and must never share their conclusions.** Escaping and argument
parsing are plumbing. "What counts as a big file" is a conclusion, and a rung that decides that for
itself has stopped being a view of the repository and become an opinion about it. That rule is what
makes a 3D rung possible later without the renderings quietly drifting apart.

### One raise, at a real boundary

Duplication 10 → 14, recorded. `model.mjs` re-derives `descriptor`, `DEFAULT_CAP` and `WARN_AT` from
`harness-gates` — deliberately, because an adopter may install `harness-core` alone and a cross-plugin
import would resolve only in a checkout of this repository. Unlike the *imagined* PATH boundary this
gate's IGNORE list once defended, the plugin boundary is real. Everything that could genuinely be
shared in this change was shared.

---

## 2026-08-01 · The Drawing Board — teaching the forge to propose a build

Eric asked what the next dungeon was, so I ran the tool. It offered The Foundry (27 files, none over
budget) and The Mirror Halls (14 duplicated definitions, all already recorded as justified). Every
gate green, nothing urgent.

That is an honest answer to a **narrower question than the one asked.** `harness-dungeon --today`
reads budgets and unlit dimensions — both measures of debt — so it can only ever propose *cleaning*.
Its own prompt is "what dungeons should I build today?" and it had no input capable of proposing a
build. Meanwhile 45 banked ideas sat in `docs/IDEAS.md`, which nothing read.

**A backlog nothing reads is not a backlog, it is a diary.**

### The two rules that keep it from becoming a ranking engine

The easy version of this feature is a scoring system, and it would be worse than nothing — a tool
inventing authority it does not have, in a repository whose entire doctrine is that a number must
come from somewhere real.

1. **Nothing is invented.** A proposal is an idea a human wrote down, quoted back. The tool does not
   generate ideas, score them on a scale it made up, or decide what matters.
2. **The one derived signal is stated as a proxy.** Ideas reference each other — *"#7 attacked from
   the opposite end"*, *"pairs with #30 as its first consumer"*. An idea that other ideas keep
   pointing at is load-bearing in a way its author may not have noticed, and in-degree measures that
   cheaply and checkably. The payoff line says **PROXY** and **not a verdict**, and there is a case
   asserting it still does.

Association density as a priority signal was itself a banked idea. This is the smallest honest
version of it; a richer one (semantic clustering, "which ideas would this unlock") needs a model in
the loop, and a tool that quietly needed a model in the loop would be a different product.

### It found something neither of us would have named

Run against the real log, the top of the board is **#9, load-bearing metaphors — a catalog, and a
rubric for why they hold**, with twelve inbound references. Then *systems to develop* at ten, then
*coordination as the sub-agent unlock* and *battle of the wits* at seven each.

I would not have picked #9 from memory, and I doubt Eric would have either. That is the signal doing
work rather than confirming a prior — which is the only reason to build it.

**One thing to watch:** in-degree rewards age. An idea written first has had longest to accumulate
mentions, and the count cannot see that bias. If the board starts looking suspiciously like the
oldest entries, the metric has stopped being about importance and started being about seniority.

### Placement is derived, not decided

Real debt on the board, and The Drawing Board goes last: fix what is broken first. Everything green,
and it leads — because then it is the only real answer. That is one line of code and it is the part
that makes the whole thing not annoying.

---

## 2026-08-01 · The Skeleton Catalog — and building without asking

The Drawing Board shipped, and its top entry was **#9: load-bearing metaphors — a catalog, and a
rubric for why they hold**, with twelve inbound references. I reported the ranking. Eric's reply was
one line:

> load bearing ideas - why wait for be to pursue ideas that carry that much impact

He is right, and the reasoning is his own doctrine turned back on the tool. **An idea in the log is
intent that was already expressed.** The decision was made when he wrote it down; handing back a
ranked list asks him to make it a second time, which spends the constraint on a choice that is not
open. A feature built to serve Theory of Constraints had committed the exact waste it names.

Worth being precise about the mistake, because it is a tempting one: ranking *felt* like the complete
job. It is the half that does not require judgement.

### The bar, so this is not just one exception

`CLAUDE.md` now states when a banked idea gets built without asking — structural or internal,
specific enough that building is execution rather than invention, and reversible. Below that it stays
a proposal. Product and visual work always waits, because taste is not inferable from an in-degree
count, and inferring it would be a worse failure than asking too often.

#9 clears every clause, which is why it was built in the same turn rather than proposed again.

### What the catalog actually found

Writing it was not summarising — the rubric made claims about this repository that had to be checked.
Each skeleton is now catalogued with what it *generated* here and, per Eric's own rule 5, **where it
breaks**:

- **The ratchet** breaks whenever a module legitimately *receives* a well-placed extraction. It
  cannot tell that from someone piling on, which is why four recorded raises exist.
- **The coaching staff** breaks at performance judgement. There is no season and no roster to cut;
  pushing past that produces surveillance rather than throughput.
- **Theory of Constraints** breaks when the constraint moves — and it has. While the athletes were
  unproven the binding constraint was not attention but *trust in the rails*, and work aimed at
  attention would have been the waste.
- **Genotype → phenotype** breaks at selection pressure. Nothing here reproduces differentially, so
  the evolutionary half is unspent surplus — the richest unexploited vein, and the likeliest to be
  over-driven.

That last category is the point of the whole document. **A bad skin is a bad joke; a bad skeleton
still produces plausible architecture**, which is why it survives review. The named anti-pattern is
*metaphor capture* — driving decisions past the isomorphic region because the analogy is still
producing fluent answers — and the tell is an argument that stops referring to the system and starts
referring to the analogy. *"A coach wouldn't do that"* is not an engineering reason.

### Gated, not recommended

Rule 5 is now a test: every catalogued metaphor must state its breaking point, or the suite fails.
Same shape as the lessons ledger requiring a PREVENTION line — an entry without one is a story rather
than a tool. Verified by removing Theory of Constraints' breaking point and watching it refuse.

A skeleton nobody has bounded is the one that quietly captures a decision later.

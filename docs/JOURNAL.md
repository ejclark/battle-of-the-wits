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

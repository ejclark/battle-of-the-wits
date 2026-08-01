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

# Deciding — the north stars, and how to use them

Every other document here says what the system does. This one says **how to choose**, and it is
written for a contributor rather than for a maintainer, because the hardest part of joining a system
like this is not learning the commands. It is knowing which of forty reasonable things to do next.

---

## 0 · This is a professional setting

Said first because it governs everything after it.

**Be respectful and courteous.** Not as decoration on the work — as part of it. Everyone here is
someone's colleague, review is about the change and never about the person, and a disagreement
resolved well is worth more than a disagreement won.

**The expectation is that you build.** That includes building the community. Answering a question,
fixing the sentence that confused you, writing down the thing you had to work out — that is
contribution, and it counts. Nobody here is a spectator, and nothing in this system is a spectator
sport.

**It has never been easier to help someone.** It has also never been easier to build a solution. Both
of those are new, both are load-bearing, and treating them as true changes what is worth attempting.

---

## 1 · If you can explain it, you can build it

This is close to literally true now, and it is the most important thing on this page — because of
what it implies rather than what it promises.

If explanation is sufficient to build, then **the quality of the explanation is the quality of the
build**, and the bottleneck moves from *can we implement this* to *do we actually know what we mean*.
That is not a smaller problem. It is a much harder one wearing more comfortable clothes.

**Communication is hard**, and it is hard for structural reasons rather than for want of effort:
there are many variables in play, most of them unstated; the person explaining has context the
listener does not and cannot tell which parts are missing; and the words that feel most precise —
*simple*, *fast*, *clean*, *better* — are the ones carrying the most unexamined disagreement. A
specification that two people read differently is not a specification. It is two specifications that
have not met yet.

Which is why improving communication is not soft-skills advice here. **It is the highest-leverage
technical work available**, and this repository already has a drill for the sharp end of it:
`/harness-core:ears` turns a wish into a requirement with a named system, a single trigger, and a
verifiable response. Use it whenever a request feels obvious — obvious is exactly the condition under
which two people discover a week later they meant different things.

Three habits that carry most of the value:

- **State what you saw, then what you concluded** — in that order, and separately. The observation
  survives being wrong about the cause; a conclusion presented alone takes the observation down with
  it when it fails.
- **Say the thing you think is too obvious to say.** It is the single most common location of a real
  disagreement, precisely because nobody checks it.
- **Prefer an example to an adjective.** "Fast" is an argument. "Under 200ms for a thousand rows" is
  a test.

---

## 2 · Theory of Constraints — deciding what to work on

One idea, and it is the one that makes a long list of good options tractable:

> **Every system has exactly one binding constraint at a time, and improving anything else changes
> nothing.**

That is not a metaphor and it is not motivational. It is arithmetic: throughput is set by the
narrowest point, so effort spent widening any other point produces a system that is exactly as fast
as it was, and a person who is tired.

The loop:

1. **Identify** the constraint. Not the annoying thing — the thing that, if it went twice as fast,
   would make the whole system go faster. Those are usually different, and the annoying thing wins
   attention it has not earned.
2. **Exploit** it. Get everything possible out of the constraint before spending anything on it.
   Usually this means removing work from it that did not need to be there.
3. **Subordinate** everything else to it. Other things run at the constraint's pace, deliberately. A
   non-constraint running at full speed just builds a queue in front of the constraint and calls it
   progress.
4. **Elevate** it. *Now* spend money, people, or tokens widening it.
5. **Repeat — and expect the constraint to have moved.** Elevating one always promotes another. A
   model of the constraint that nobody re-derives is a slogan.

**Tactically**, this answers *what do I do this afternoon*: whatever is in front of the constraint.
**Strategically**, it answers *where is this going*: watch the constraint's trend line, not today's
number. A constraint that has been tightening for a month is a different situation from the same
number reached last week, and the two want opposite responses. History plus a read on the road ahead
is what makes a course correction cheap; the same correction discovered late is a rewrite.

**In this repository** the constraint is stated openly: the owner's attention. That produces rules
that look strange until you know why — absorb noise rather than escalating it, auto-merge as
opt-*out*, and *a gate that costs attention must buy more than it spends*. All three are subordination
to the constraint, not preferences.

---

## 3 · The Three Ways — how work moves, and how it gets better

From DevOps, and more load-bearing under AI than before it, because AI makes the first Way cheap and
leaves the other two exactly as expensive as they always were. **That asymmetry is the whole risk of
this era**: when producing gets fast and verifying does not, unverified output accumulates, and it
accumulates fastest in whichever direction nobody is looking.

**The First Way — Flow (left to right).** Work moves toward done without piling up. Small batches, no
work in progress beyond what can finish, and never pass a known defect downstream.
*Here:* small focused PRs, `harness-fleet`'s WIP cap, squash-merge, the branch-per-change rule.
*Note the cap exists because parallel work stops paying once review capacity binds — flow is limited
by the constraint, not by ambition.*

**The Second Way — Feedback (right to left).** Problems are seen fast, close to where they were
created, by the person who can fix them.
*Here:* every gate; **detection lag** as the metric that judges the system rather than the code;
`/retro`; `/intake`, which is the feedback path for the signal no instrument can capture — a person's
confusion.
*This is the Way that AI does not accelerate, which is why most of this harness lives in it.*

**The Third Way — Continual learning and experimentation.** Make it safe to try things, and make the
lessons durable rather than tribal.
*Here:* the ratchet, which makes every improvement permanent without anyone maintaining discipline;
`docs/LESSONS.md`, where an incident becomes a prevention; `docs/IDEAS.md`; the metaphor catalog. Also
the reason experiments are cheap: gates, revert, and a protected default branch mean being wrong costs
minutes.

A useful diagnostic: **if you cannot say which Way a piece of work serves, it may not be work.**

---

## 4 · Constraint succession — the level-up ladder

Elevating a constraint does not end the game. It promotes the next one, and the interesting part is
that **the new constraint is usually of a different kind than the old one** — which is why it is so
often missed. People keep optimising the thing they just fixed, because that is the skill they built.

The succession this system has actually walked, and where it plausibly goes:

| Binding constraint | What it felt like | What elevated it |
|---|---|---|
| **Implementation** — could we build it at all | everything takes a week | AI; "if you can explain it you can build it" |
| **Trust in the rails** — dare we let it run | reviewing every line by hand | gates, ratchets, planted-violation tests |
| **Human attention** — one person must judge everything | a queue in front of one inbox | contributors, codified drills, work that never routes through the owner |
| **Knowing what is worth building** ← *plausibly next* | many good options, no way to rank them | ? |
| **Knowing whether you were right** | shipped a lot, learned little | ? |

**Recorded because the table was wrong, which is the useful part:** it named *knowing what is worth
building* as plausibly next, and the constraint went somewhere else entirely. A **customer arrived**,
and the binding thing became **stability of the surface they touch** — a constraint that was not in
the succession at all. So: **constraint succession is not a queue.** An external event can promote
one that was never next in line, and this table is a prompt to re-derive rather than a forecast to
follow. That is the second time here — the first was *trust in the rails* — and both times the
warning was already written down: a model of the constraint that nobody re-derives is just a slogan.

The last two are worth staring at. When execution stops binding, **judgement about what deserves
execution starts binding** — and judgement is the thing this harness deliberately refuses to
mechanise, because a system that scored importance would be inventing a number. After that, the
binding thing is likely **loop length**: how long until you know whether a decision was right. That is
the Second Way, arriving as the constraint rather than as hygiene.

The framing worth carrying: **each elevated constraint unlocks a class of action that was previously
impossible, not merely slow.** That is a level-up rather than a speed-up — a new attribute, not a
bigger number. Being able to try five approaches and keep one is not "faster than trying one"; it is a
different move, and it changes what is worth attempting. The value of an elevation should be judged by
**what it makes newly possible**, not by what it makes faster. If elevating something only made the
same work quicker, it was probably not the constraint.

Which makes "what constraint emerges after this one?" a genuinely productive question to keep asking
out loud — the answer names the next capability the system does not yet have, and naming it early is
most of getting it.

---

## 5 · Expansions — the release class above a patch

An expansion is not a big patch. *The Burning Crusade* was not more of vanilla: it raised the level
cap, opened portals to planes that did not exist, and added flight — a **movement class**, not a
speed. Afterwards the same player could do things that had previously been impossible, and that is a
different kind of event from a patch, however large.

Which makes it the same thing §4 already describes: **an expansion is a constraint elevation,
packaged and announced.** That connection gives it a test rather than a vibe.

### The payoff test

> **An expansion must state what becomes newly POSSIBLE. If the best statement of its payoff is a
> comparative — faster, cleaner, simpler, better — it is a patch wearing a costume.**

Falsifiable, cheap to apply, and it kills most candidates. "Flight" passes. "Improved mount speed"
does not, and no amount of scope makes it pass. This is the level-up/speed-up distinction made
operational, and it is the whole reason to have the category at all: a release class whose entry
criterion is *size* just relabels big work, and everyone learns to inflate.

### Two release classes, and they take opposite disciplines

This is the mountain/ocean split from `METAPHORS.md`, applied to shipping:

| | **Patch** — mountain | **Expansion** — ocean |
|---|---|---|
| Retreat | always available; revert is one squash | committed once it lands in anyone's hands |
| Contains breaking changes | **never** | this is where they live |
| Caution is spent | on keeping retreat open — small, verified, reversible | on **provisioning before departure**; afterwards there is nothing to spend it on |
| Decided by | doing it | deliberately, in advance, by a human |
| Announced | it isn't | it is — that is half of what makes it one |

The operative rule falls straight out: **a breaking change is not a patch that broke something. It is
an expansion, or it is a mistake.** Conventional Commits already carries the marker; what is missing
is that the marker currently points at nothing.

### Contributors owning a direction — the part that makes influence real

Right now standing gates **write radius** and nothing else, which means "influence" stops at
permissions. Owning an expansion is the first thing in this system that would be genuinely *directing*
rather than *contributing*, and it is the shape worth building when the time comes:

- An expansion has **exactly one owner**, named, and the owner is accountable for the payoff
  statement being true when it lands.
- **Ownership requires `builder` or above by evidence** — not by appointment. This is where earned
  influence finally does something that matters: you cannot drive a direction until the history shows
  your changes hold. That is objective, it is the thing you asked for, and it is un-gameable in the
  same way standing is.
- It **groups banked ideas** (`#N` references into the idea log), so an expansion is assembled from
  intent someone already expressed rather than invented in a planning meeting.
- It has three states — **charted / crossing / landed** — and the payoff statement is written at
  *charted* time, before the work, which is what makes it a commitment rather than a summary.
- The owner may be a contributor and the reviewer of record may still be the owner of the repository.
  Directing is not the same as merging, and separating them is what makes it safe to hand out early.

### Cadence, and community presence

Both are real needs and **neither is a need yet.** Naming the triggers is the useful thing:

- **Cadence** becomes necessary when two people's work must land *together* to be coherent — not
  before. With independent contributions, a cadence is a queue you built for yourself. Trigger:
  the first expansion with more than one owner-adjacent contributor.
- **Community presence** — a public roadmap, release notes written for readers rather than machines,
  a place people ask questions — is **outward-facing identity**, and by §"Experience is the north
  star" in `COACHES.md` that still waits. It is taste, it is the owner's, and elevating experience to
  a north star explicitly did not transfer it. Trigger: someone outside the household asks when
  something is coming.

### Why none of this is built yet

**This repository has never had a breaking change.** Zero, across its whole history. Building
expansion machinery — a manifest, a gate, a state model, a cadence — before the first one is exactly
the premature abstraction this document argues against, and the roster recruits itself from
demonstrated repetition rather than anticipated need.

So the design above is written down and the mechanism is not. That ordering is deliberate: the design
costs nothing to hold and is ready the day it is wanted, whereas an unused mechanism costs maintenance
every day and teaches everyone that the system is full of ceremony. **The trigger is the first change
that genuinely cannot be a patch** — and when it arrives, the thing to build is the smallest version
of the above that carries it, not all of it.

## 6 · Data is the bedrock — which is an argument about capture, not about storage

Agreed on the premise, and the premise has a sequencing trap inside it.

**Git is already the database.** It is append-only, content-addressed, fully historical, provenanced,
and every adopter has one. A retro that produced real numbers — three workflows, 26 agents, 2.85M
tokens, a design half that shipped nothing — was computed from 51 commits, 19 budget snapshots, 34
incident entries and a backlog file, with **zero infrastructure**. Nothing about that was blocked on
storage.

Exactly one class of measurement was missing, and it was missing for a reason worth naming: **what a
run cost while it happened lived in a session and died with it.** That is the asymmetry that decides
the order of work here.

> **You cannot mine data you never recorded.** Recording costs almost nothing. Not recording is
> unrecoverable, and it is invisible until you look back and find nothing there.

So the gap was **capture**, not storage, and capture is what `harness-log` closes. Append-only JSONL,
committed, queryable with `jq`, loadable into DuckDB or SQLite in one command the day it outgrows
that — which is the migration path, and it is free. Two design decisions carry the rest:

- **`merge=union` on the ledger**, so two branches appending in parallel merge instead of conflicting.
  An append-only log under a normal merge driver conflicts on every concurrent write, which is how a
  metrics file quietly gets deleted by the first person in a hurry.
- **No actor field, ever.** It records *what happened*, never *who did it*. A per-person performance
  log is a different product with a different ethics, and the aggregation trap is documented next
  door: individually innocuous entries accreting into a profile nobody decided to publish. The schema
  is the defence — you cannot query a column that does not exist.

### Measurement taxes the system — and the tax is set by where it attaches

Observation is never free, so it has to be priced. Measured here rather than assumed, on the
commit-boundary hook: **58 ms per commit**, of which **26 ms is bare interpreter startup**, and **89
bytes per record** — 713 KB a year, 7 MB a decade at twenty commits a day.

Negligible. But the number on its own means nothing, because the *same 58 ms* costs this:

| Attached to | Cost per working day | |
|---|---|---|
| a commit (~20/day) | 1.2 s | free |
| a gate run (~10 per commit) | 11.6 s | noticeable |
| a scanner invocation | 7.0 s | noticeable |
| **a file scanned** (~4,800/day) | **278 s** | **fatal — nobody keeps it on** |

Identical code, four and a half minutes a day apart, and the only variable is the attachment point.
So the rule is not "measure less". It is:

> **Attach measurement to BOUNDARIES, not to units of work.**

Which is the same answer the retro drill reaches from a completely different direction — a boundary
is where the timeline can be *read* instead of reconstructed. Two independent arguments, cost and
fidelity, landing on one rule is the strongest signal available that the rule is real.

**And the compute tax is the small one.** The expensive tax is behavioural: a measured dimension
becomes a target, and the system drifts toward the proxy. This project already states that in its
sharpest form — *the moment the metric grants the power, the metric becomes the work* — and it
generalises. Before adding a measurement, ask what someone would do to make the number look good, and
whether you would be happy if they did.

### Hard data outranks theory — about what it measured, and no further

Correct, and worth stating precisely, because the imprecise version is how measurement gets misused:

- **About what was measured**, hard data wins outright. A theory that contradicts an observation is
  wrong, and this is why an afternoon spent computing something beats a week of arguing about it.
- **About what was NOT measured**, theory is *better* — because at least a theory names its mechanism
  and can be checked. An extrapolation from data names nothing.
- **The dangerous class is hard data extrapolated.** It carries a theory's uncertainty and a
  measurement's credibility, which is the worst pairing available. Six records showing commits
  getting smaller is not a trend; it is a story about a few days wearing a number's clothes.

Hence the honest failure mode to guard: not "we lack data" but **"we have data about the wrong
thing"** — a proxy, measured precisely, reported confidently. `harness-log --report` therefore states
its own sample size and refuses to describe a direction below one, which is the same posture every
gate here takes toward a dimension it cannot measure.

The practical version, when a number and an argument disagree: **check what the number actually
measured first.** Most of the time it measured something adjacent to the claim, and the disagreement
dissolves once that is named.

### When a database is the right answer

Not never. The trigger is specific, and it is not a row count:

> **A query you can state and cannot answer.**

"Which gate fires most often" is answerable with `jq` over a decade of this. When a real question
genuinely is not, *that question specifies the schema* — and building storage before it exists means
guessing the schema and being wrong in a way that is expensive to undo, which is the one shape of
mistake this whole harness is built to avoid.

There is also a hard portability constraint that a database has to clear before it is even eligible:
**an adopter installs plugins; they do not stand up Postgres.** Anything that requires a service to
be provisioned, hosted and backed up stops being a portable harness and becomes a product with an
operations manual. Whatever storage eventually arrives has to be a file, or it has to live in the
target repo's own infrastructure rather than in the harness — the same line every other piece of
state here already sits on.

### What to mine, once there is enough

Stated now so the capture is pointed somewhere rather than hoarded:

- **Detection lag per gate** — how long between a defect landing and something noticing. Already the
  learning coach's metric, currently reconstructed by hand each time.
- **Ratchet direction over time** — debt retired versus growth accepted. Both are recorded; a ledger
  that logged only improvement would be a scoreboard.
- **Which gate fires most** — that is where the rework is, which is a different question from which
  gate matters most, and conflating them is how a useful gate gets switched off.
- **Time-to-first-merge per contributor cohort** — the falsifiable criterion in `CONTRIBUTORS.md` is
  currently unmeasurable for want of exactly this.

## 7 · When nothing here tells you what to do

Ask, in this order:

1. **Is this in front of the constraint?** If not, it can wait — and saying so is a real answer.
2. **Which Way does it serve?** Flow, feedback, or learning. If none, be suspicious.
3. **Is it reversible?** Reversible work is decided by doing it. Irreversible work is decided
   deliberately, by a human, in advance — see the mountain/ocean crossing in `METAPHORS.md`, and note
   the point of it: front-load the caution, because there is no retreat to spend it on later.
4. **Can I state it as a requirement?** If not, that is the finding, and `/harness-core:ears` is the
   next move rather than a detour.
5. **Still stuck? Ask.** Fifteen minutes is the right threshold. In a system with this much written
   down, being stuck for an hour is a defect in the writing — and reporting it is a contribution,
   which is the whole thesis of `/harness-core:intake`.

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

## 6 · When nothing here tells you what to do

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

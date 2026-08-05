---
name: journey
description: >-
  Bank a long reasoning exchange as a human-readable record: the question verbatim, where it landed,
  every claim that moved and what moved it, the branches killed and why, and the forks still open.
  Use when a conversation produced durable thinking but no code — a design exploration, a strategy
  argument, a "thought experiment" that reshaped how we'd build something — and when the session is
  about to end with that reasoning living only in context. Also when asked to "capture our journey",
  "write this up", "bank this thinking", or "what did we work out". Invokable as /journey.
---

# Journey — the reconstruction drill

Every other capture mechanism in this repo is **event-triggered**: `LESSONS.md` fires on an incident,
`docs/adr/` on a decision, `IDEAS.md` on an idea, a commit on a code change. Nothing fires on *a long
exchange where the thinking was the output*. That reasoning lives in exactly one place — session
context — and it dies with the session.

This drill is the missing trigger. It is also the **instrument** the personal-profile thesis needs:
every `claim → challenge → resolution` triple is a labeled record of where intent was misread and
what corrected it, which cannot be reconstructed after the fact.

Target is **reconstructability**, not completeness. Can a competent human recover *why*, fast enough
to act? A verbatim transcript fails that test as surely as a one-line summary does.

## 1. Take the exchange while it is still in context

Journeys are perishable. Write during or immediately after — never "later," because later the
material is gone and what gets written is a memoir instead of a ledger.

One journey per topic. `docs/JOURNEYS/<topic>.md`, kebab-case, named for the question rather than the
conclusion (the conclusion will move).

## 2. Open with the question, verbatim

Quote the original ask **unedited** — typos, fragments, trailing thoughts and all. Two reasons: it is
the only uncontaminated record of what was actually asked, and it is raw corpus for the decode layer.
Cleaning it up destroys both.

## 3. State where it stands, up top

A reader must be able to stop after thirty seconds with the current position. Put the conclusion,
the ratings, the build order — whatever the durable output is — *before* the reasoning, not after.

Any number that appears here carries its evidence basis. If there is no measurement behind it, say
so in the same breath: *"ordinal judgments with reasoning attached — not measurements."*

## 4. The spine — what moved, and what moved it

Each entry is a triple:

| Field | Content |
|---|---|
| **Claim** | the position held, and by whom |
| **Challenge** | what was put to it, and by whom |
| **Resolution** | what survived — including "X was right, Y overcorrected" |

**Record corrections in both directions.** A journey where only the human was ever wrong is a
sales document; a journey where only Claude was ever wrong is flattery. Both are useless as an
instrument, because the whole point is measuring where comprehension actually failed.

This is the section that decays first if written from memory. Write it first.

## 5. Rejected branches — the highest-value section

What was considered and killed, each with **the argument that killed it**. This is what ADRs are
supposed to contain and almost never do, and it is the section a future reader will actually need:
conclusions are cheap to store and expensive to re-derive, and a killed branch re-proposes itself
every six months until someone writes down why it died.

A branch deferred rather than killed says so, with the condition that would revive it.

## 6. Open forks — with the thing that would settle them

An open question is only useful paired with what would close it: a measurement, an experiment, a
threshold. *"We don't know X"* is a note. *"We don't know X; a week of tagging Y would tell us"* is a
task.

## 7. Pull the thread — side quests

A long exchange lights up parts of the system nobody was looking at. Log the worthy ones to
`docs/IDEAS.md` tagged `_(src: Eric | Claude · while: journey on <topic>)_`, and reference them from
the journey rather than duplicating them. Quality over volume; do not derail to build them.

## 8. Verify and ship

```bash
npm run verify        # typecheck · lint · test
```

Land it with `/ship`. A journey is docs-only, so it should be a small green PR that merges on its
own — the point is banking the material, not staging a review.

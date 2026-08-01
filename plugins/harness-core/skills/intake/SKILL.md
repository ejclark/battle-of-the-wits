---
name: intake
description: >-
  Turn a contributor's raw feedback into a banked, falsifiable observation: separate what they SAW
  from what they PRESCRIBED, keep the observation, drop the prescription, and file it to the idea log
  with attribution so it competes on merit. Use when someone reports that something is confusing,
  broken, slow, ugly or wrong; when feedback arrives as a demand or a solution rather than a report;
  when a non-technical contributor raises something and you are about to explain why they are wrong;
  or when asked to "take this feedback", "log this", or "what do we do with this". Invokable as /intake.
---

# Intake — the drill that keeps the signal and drops the noise

The *capture* half of the contributor loop. Its job is to make sure the most valuable input this
system receives — the reaction of someone who does not already know how it works — survives contact
with the people who built it.

## Why this drill exists at all

Feedback from outside the system almost always arrives as a **prescription** wrapped around an
**observation**:

> *"You should just make it use a database."*  ← prescription
> *"It got really slow once I had a few hundred of them."* ← observation

The prescription is usually worthless. It is uninformed about constraints the author has been living
inside for months, and arguing with it is how the whole exchange ends up being about the wrong thing.

**The observation is irreplaceable, and the author structurally cannot produce it.** They know too
much to be confused by their own system. Expertise destroys the instrument that measures confusion —
which is why the person who wrote an error message is the last person able to notice it is
unreadable.

So this drill is one move repeated: **keep the observation, drop the prescription, credit the person
for the observation.**

### The failure it is defending against

**Dismissal by association.** The prescription is naive, so the observation attached to it gets
thrown out with it. This is the default outcome when a technical author receives non-technical
feedback, it happens in seconds, and it feels like good judgement at the time — the prescription
*was* wrong. The signal underneath is lost silently, and the contributor learns that raising things
does not go anywhere.

The opposite failure is real too and this drill is not a licence for it: treating every remark as
actionable signal burns the constraint just as effectively. Step 4 exists to bank things without
spending anyone's attention on them now.

## 1 · Take the raw thing, verbatim

Write down what was actually said, in their words, before doing anything to it. Paraphrasing first is
how the observation gets edited into the shape you already expected.

If it arrived with heat in it — frustration, sarcasm, "this is ridiculous" — keep that too, for one
step. Emotional intensity is *data about severity*, and it is the part most likely to be stripped out
as unprofessional. Something that made someone angry is rarely something that mildly inconvenienced
them.

## 2 · Split it

Two columns. Every piece of the raw feedback goes in one of them.

| Observation | Prescription |
|---|---|
| what they saw, did, expected, felt | what they think should be done about it |
| *"I clicked it twice because nothing happened"* | *"it needs a spinner"* |
| *"I couldn't tell if it worked"* | *"it should say SUCCESS in green"* |
| *"I gave up and asked you"* | *"there should be a help button"* |

The prescription column is now finished with. Not because it is stupid — it is often a perfectly
reasonable guess — but because it is a *solution proposed without the constraints*, and the system
already has a place where solutions compete on merit. Skipping the split and arguing the prescription
is the mistake this whole drill exists to prevent.

**If the observation column is empty, you do not have feedback yet.** Go to step 3.

## 3 · Ask for what they saw — and notice whether it holds still

The extraction questions. All of them are asked in the register of *interested*, never *skeptical* —
the difference between an invitation and a cross-examination is entirely in whether the person
believes you want the answer.

- *"What were you trying to do right before that?"*
- *"What did you expect to happen?"*
- *"Can you show me? I want to see it do that."*
- *"Was it every time, or that one time?"*
- *"What did you do next?"* — the workaround is often the real finding.

Then the one distinction that does the security work in this whole model. You are **not** reading
anyone's motives; you are checking one property of the answer:

| | **A real observation** | **A pretext** |
|---|---|---|
| Has | a *what I saw* and a *what I expected* | a desired outcome and a reason for it |
| Under "show me" | reproduces, or narrows honestly to when it happened | cannot be shown, and the subject changes |
| When challenged | **holds still** — they defend the same thing | **shifts** — a new rationale for the same ask |
| Survives | being wrong about the cause | only its own conclusion |

A real observation is **falsifiable**. Its author can be shown to have misread the cause and will
still have seen what they saw. A pretext is a conclusion looking for a justification, and the tell is
motion: challenge the reason and a different reason appears, aimed at the same outcome.

This is objective, it does not require suspecting anyone, and it works the same on a friend, a
stranger, and yourself. Someone who genuinely saw something has nothing to protect. **Ask once,
neutrally, and let the answer do the work.** Repeat it and you have built an interrogation, which
costs more than any pretext ever will.

## 4 · Bank it

**If it arrived as an issue, it is already banked** — that is what the issue tracker is for, and
re-typing it into a file buys nothing. Curate it into the idea log only when it becomes something the
backlog should rank: a recurring theme, or an observation another idea starts pointing at. **An issue
is the front door; the idea log is the shelf.** Getting that backwards is how a two-minute report
turns into a pull request nobody files.

When it does belong on the shelf, append it to the idea log (`docs/IDEAS.md` by default —
`harness-standing --zoning` prints the layout this repository actually uses), in the log's own entry
form, with attribution:

```markdown
**41. The run summary does not say whether anything failed.**
Watched someone read the output of a full run three times and then ask "so did it work?". They
expected a verdict line and there is only a table. _(src: <contributor> · while: first run-through
of the adoption sequence)_
```

Three rules for the entry, and each one is load-bearing:

1. **State it as what was seen, not as what to build.** *"Could not tell if the run passed"* is an
   observation that survives being solved five different ways. *"Add a status line"* is one of those
   five, pre-committed, before anyone checked the others.
2. **Attribute it to their ROSTER ID — never to a name, a handle, or an address.** The attribution
   *is* the credit, and a contributor whose observations sit visibly in the backlog is participating
   whether or not they can write the fix. `parseIdeas` already reads `src:`, so this is provenance
   rather than courtesy.

   But the idea log is **committed**, and in a public repository it is permanent. Each entry passes
   the dignity rule on its own; **twenty of them do not.** *"Could not tell whether the run passed"*,
   *"read it three times"*, *"gave up and asked"* — all correctly written about the system, all under
   one real name — aggregate into a public capability profile of a private person, assembled one
   innocent commit at a time. Nobody decides to publish it; it accretes.

   A roster id breaks the aggregation at the source. `tony` is credit inside the project and nothing
   to a stranger, the id→person mapping stays in `.harness/roster.json` where it is already local,
   and every downstream surface that reads `src:` inherits the redaction for free.
3. **Do not rank it yourself.** The log ranks by how many other ideas point at it. An observation
   nobody else's work touches was a one-off; one that keeps getting referenced was load-bearing and
   its author noticed something real. Let that resolve on its own rather than pre-judging it.

## 5 · Close the loop, in one line, always

Tell them where it landed. One sentence.

> *"Logged that as #41 — the output doesn't say pass or fail, which is a real gap. Not doing it
> today, but it's in the list under your name."*

This is the step that gets skipped and the one that decides whether there is ever a second piece of
feedback. Silence after feedback reads, correctly, as *that went nowhere*, and a contributor who
concludes that stops producing the one signal nobody else in the system can produce.

**Never report back with a verdict on the prescription.** *"A database wouldn't help here"* answers a
question they were not really asking and teaches them that raising things means being corrected. If
the prescription genuinely needs addressing — they will build it otherwise, say — address it
separately, after the observation is banked and credited.

## When the feedback is simply wrong

Common, and not a problem. Someone reports that a thing is broken and it is working correctly.

**They still observed something.** The observation is not *"it is broken"* — that was their
prescription of a cause. The observation is *"I believed it was broken"*, and that is a real,
bankable defect in what the system communicated. Log that instead:

> *"Read the skipped-check output as a failure. Nothing is wrong with the check; the wording does not
> distinguish 'did not run' from 'ran and failed'."*

The only feedback with nothing in it is feedback with no observation *and* no confusion — a pure
preference, stated once, about something nobody is confused by. Note it and move on.

## Boundaries

- **Never write a characterisation of the person into any artefact.** Not the log, not a commit
  message, not an issue, not a prompt. Log what was observed about the *system*. Any assessment of a
  named human is personal information and belongs nowhere the repository can reach — the dignity rule
  in `${CLAUDE_PLUGIN_ROOT}/docs/CONTRIBUTORS.md`, which has the full reasoning.
- **The log is not a promise.** Banking an observation commits to remembering it, not to building it.
  Say so plainly at capture time; a contributor who believes every logged item is scheduled will be
  disappointed on a timetable.
- **One observation per entry.** A paragraph containing four findings gets read as one and ranked as
  one, and three of them quietly disappear.

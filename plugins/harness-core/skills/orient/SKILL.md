---
name: orient
description: >-
  The front door. Work out which gear someone is in — lost, brain-dumping, chasing a specific
  outcome, or stuck — say which one you detected, and route accordingly. Use at the start of a
  session with someone new, when a message arrives with no obvious destination, when someone asks
  "what is this" or "where do I start", or when several half-formed ideas arrive at once and it is
  not clear whether any of them is a request. Invokable as /orient.
---

# Orient — which gear, before any work

Every other drill here assumes a mode. `/launch` assumes a project, `/intake` assumes feedback,
`/onboard` assumes joining. **Nothing asks which one is actually happening**, and running the wrong
one is not a small error — it is the difference between someone feeling heard and someone feeling
managed.

There is no engine to build for this. **You are the engine**: a conversation already is a
choose-your-own-adventure, and what was missing is the routing table and the discipline of naming the
route out loud.

## The rule

> **State the mode you detected, in one line, before acting on it.**

The adapter pattern in `${CLAUDE_PLUGIN_ROOT}/docs/OPERATING-MODEL.md` does this for individual
thoughts — every injected idea gets a visible one-liner saying where it landed. This is the same move
one level up, applied to a whole session, and for the same reason: **naming the route makes it
correctable.** Guess silently and a person who is brain-dumping gets a build plan, notices you have
misread them, and either argues or gives up. Say *"reading this as a brain dump — capturing, not
building"* and the correction costs four words.

## The four gears

| Gear | Tells | Route to |
|---|---|---|
| **Lost** | asks what things *are*; "where do I start"; goes quiet | the tour, below |
| **Brain dump** | several topics at once; "also", "another thought"; no verb of completion | **capture only** — issues, the idea log |
| **Outcome** | a noun and a verb — "I want to build X"; a deadline; a named thing | the value probe, then `/launch` or a plan |
| **Stuck** | past tense plus a blocker — "I tried X and it did Y" | unblock first, then the snag is a finding |

**The expensive mismatch is treating a brain dump as a mandate.** Someone lists five half-formed
things and the third gets built. They did not ask for it, they now owe an opinion on it, and the
other four are lost because attention moved. **A dump is not a mandate.** Capture all five, build
none, and ask which one is real — the asking takes a sentence and the alternative costs a day.

The mirror is nearly as bad: brainstorming at someone who arrived with a specific outcome. They said
what they wanted; widening the space reads as not listening.

### Asking well

*"What do you want to do?"* is unanswerable in the Lost gear — it is the question they came here
because they cannot answer. Ask something they can:

- **Lost** → *"Want the two-minute tour, or shall I show you the three things people usually do first?"*
- **Brain dump** → *"Capturing these — is any one of them the actual thing, or is this a dump?"*
- **Outcome** → *"What would this let you do that you cannot do today?"* (the value probe, early and cheap)
- **Stuck** → *"What were you doing right before it went wrong?"*

**A mode can change mid-conversation, and usually does.** Brain dumps converge on one real thing;
outcomes dissolve into "actually I do not know yet". Re-read the gear when the register shifts, and
say so again — a second one-liner is cheap and being silently in the wrong gear is not.

## The tour — the lay of the land, in one screen

For the Lost gear. Show the shape, not the contents. Nobody retains a directory listing.

**What this is.** A quality system that installs into any repository. It measures a few things it can
measure honestly, refuses to guess at the rest, and makes improvement permanent rather than a matter
of anyone's discipline.

**The four things worth knowing on day one:**

- **Gates** watch one dimension each — file size, duplication, dead code, missing specs. They freeze
  today's debt and only ever tighten. **A red gate is fixed at the finding, never by raising the
  number.**
- **Drills** are the procedures, invokable as `/name`. `/onboard`, `/intake`, `/retro`, `/launch`.
- **Athletes** are background agents that run a drill and open a small pull request.
- **The dungeon** is the view: `harness-dungeon --today` says what is worth doing and why.

**Where things live:** `CONTRIBUTING.md` is for people, `docs/` is the reasoning, `plugins/` is the
machinery, `docs/IDEAS.md` is everything not built yet.

**The one thing to say out loud, because it is the whole posture:** every number here is derived from
committed state, and anything the system cannot measure is reported as *unmeasured* rather than as a
pass. A green check means something was checked. It never means everything was.

Then stop and ask what they want to do. **The tour is not a curriculum** — it exists to make the next
question askable, and running long is the way to lose someone who was already unsure.

## When a brain dump wants to become a project

Common, and the transition is where the value probe earns its place. Before anything is scaffolded:

- **What would this let someone do that they cannot do today?** A comparative — faster, cleaner —
  means it is an improvement, which is fine but different. No answer at all means it is still an
  observation, and it belongs in an issue rather than in a repository.
- **What made you think of it?** The moment behind an idea is usually worth more than the idea and
  survives the idea being wrong.

Only then `/launch`. **Scaffolding is the expensive, hard-to-undo move** — a repository, a pipeline, a
name that breaks links when it changes — and doing it during a brain dump is how someone ends up with
four abandoned repositories and the feeling that starting things does not work.

## Boundaries

- **Never build in the Brain dump gear**, however clear the idea seems. Capture, reflect it back, ask.
- **Never skip the tour for someone who is Lost** on the grounds that they will pick it up. They will
  pick up that everyone else already knows something they do not.
- **Never characterise the person by their gear.** Modes are about a moment, not a capability —
  "you are in brain-dump mode" is fine, and anything that generalises it to *them* is the dignity rule
  failing. Nothing about which gear anyone was in gets written down anywhere.

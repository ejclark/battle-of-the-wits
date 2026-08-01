---
name: retro
description: >-
  Turn a failure, a caught slip, or a surprise into a banked lesson: reconstruct the timeline, find
  the root cause, measure how long detection took, install the cheapest prevention that makes the
  drift impossible, and record it in docs/LESSONS.md. Use when a net catches drift (a red gate, a
  failed deploy, a bug that escaped), when `harness-incident-scan` names an unlearned incident,
  when something took far longer to notice than it should have, or when asked to "run a retro",
  "what did we learn", or "why did this slip through". Invokable as /retro.
---

# Retro — the learning drill

The *correction* half of the learning Coach. Its eye (`harness-incident-scan` +
`incident-budget.json`, enforced by `tests/arch/lessons.spec.ts`) watches one dimension no other
coach watches: **how long a process gap goes unrecognized.** Every other gate looks at the code.
This one looks at us.

Blameless, always. The question is never "who missed it" — it is "what about the *system* made
missing it the likely outcome."

## 0. Run it at a fault line, not at the end

**A retro belongs at a natural boundary** — a commit, a merge, a gate firing, a dispatch completing,
a decision reversed. Not at the end of a long stretch of work, where it becomes an archaeology
exercise.

The difference is not tidiness, it is **cost and fidelity**:

- **At a boundary**, the timeline is *readable*. What happened is still in front of you, the cause is
  one small change, and the insight is nearly free.
- **At the end**, the timeline has to be *reconstructed* — and reconstruction is both expensive and
  lossy. You pay for it every time, and you can only ever see what survived. The thing that was
  briefly confusing and then got fixed leaves no trace, and that was usually the finding.

Which gives commit size a second job nobody advertises: **it is the sampling rate of your own
learning.** A stretch of work committed four times can be retro'd at four points, and each of those
retros has to account for a quarter of everything. Committed twenty times, each one covers a twentieth
and reads off the diff. Small commits are not only about review and revert — they are how often the
system is *able* to notice something about itself.

*(Measured here: a session that shipped ~3,000 lines in four commits — 15 files and 1,614 insertions
in the largest, against a repository median of 7 files — had to reconstruct its whole timeline
afterwards, and roughly half its build span was rework the gates reported against a surface too large
to attribute cleanly. The first commit alone contained six independently-shippable things.)*

The `commit` records in the run ledger exist for this: the boundary is written down as it happens, so
a later retro reads rather than reconstructs. `harness-log --report` shows the trend.

## 1. Take the incident (don't hunt for one)

```bash
harness-incident-scan --candidate     # {"candidate": <oldest unlearned run>|null, "debt": n}
harness-incident-scan                 # the full unlearned list
```

`--candidate` always emits one JSON object, even with no token and no network — `candidate: null`
means there is nothing to retro from CI, not that the command failed.

Or take the one in front of you: a red gate, a reverted commit, a bug Eric found, a surprise in
production. One incident per pass.

## 2. Reconstruct the timeline — and measure the lag

Write down three moments, then the number that matters:

| Moment | How to find it |
|---|---|
| **Cause** — when the change landed | `git log --oneline -- <file>`, the merge commit |
| **First detectable** — the earliest point any existing signal *could* have fired | the first red run, the first wrong output |
| **Actually detected** — when a human or gate noticed | the chat message, the alert, the failing job |

**Detection lag = actually-detected − first-detectable.** This is the Coach's real metric. A lag of
seconds (a spec went red) is a healthy system. A lag of days (four silent deploys) is the finding —
bigger than the bug itself, because it says a whole class of failure is currently invisible.

## 3. Root cause — the mechanism, not the symptom

Ask "why" until you reach something *structural*. "semantic-release failed" is a symptom; "a plugin
pushes directly to a branch we made protected" is a mechanism. Stop when the answer names a rule of
the system rather than an action someone took.

**The highest-yield question we have found, ask it every time:**

> **What else crosses this system?**

Both deploy outages came from changing something shared without enumerating its consumers — branch
protection has more consumers than pull requests (semantic-release), and `prepare` has more callers
than developers (the Dockerfile's `npm ci`, which runs *before* `COPY . .`). Enumerate the list out
loud; the second name on it is usually the bug.

## 4. Choose the prevention — cheapest thing that makes it impossible

Rank, best first (this ordering is the doctrine; deviating needs a stated reason):

1. **A gate or a script.** The drift becomes mechanically impossible or is caught in seconds. One
   build cost, free forever. Prefer *shortening detection lag* over preventing the specific bug —
   a gate that catches the whole class beats a fix for one instance.
2. **A doctrine line** in `CLAUDE.md` / `${CLAUDE_PLUGIN_ROOT}/docs/COACHES.md` / `${CLAUDE_PLUGIN_ROOT}/docs/ENGINEERING.md` — loaded into
   every future session's context, so it steers the next decision rather than sitting unread.
3. **A ledger entry alone** — only when mechanizing costs more than the expected damage. Say so.

Then apply the interrupt-economics test in reverse: if the same slip recurring would be cheap and
self-correcting, do not build ceremony around it. Process that taxes flow at scale is a net negative
(`CLAUDE.md` → blameless retro on detected drift).

## 5. Pull the thread — side quests

A failure is a lit path into a part of the system nobody was looking at. While you are standing
there, ask: what *else* is unguarded in this same way? Which other consumers of this shared thing
are untested? Log the worthy ones to `docs/IDEAS.md`, tagged
`_(src: Claude · while: retro on <incident>)_` — quality over volume, and do not derail to build
them now.

## 6. Bank it

Append an entry to `docs/LESSONS.md` in the documented format (title, `SHA`, `DATE`, `STATUS`,
`SIGNAL`, `ROOT CAUSE`, `PREVENTION`, `SIDE QUESTS`). The gate parses these field names, so keep
them exact, and never leave `STATUS: open` — an open entry fails the build by design.

## 7. Verify and ratchet

```bash
npm run verify                      # typecheck · lint · test (the ledger gate runs here)
harness-incident-scan      # every incident on main now has a lesson
```

Land it with `/ship` (verify → REST open → one auto-merge call → stop). If the prevention was a new
gate, that gate's own budget starts at today's number and ratchets down from there.

---
name: retro
description: >-
  Turn a failure, a caught slip, or a surprise into a banked lesson: reconstruct the timeline, find
  the root cause, measure how long detection took, install the cheapest prevention that makes the
  drift impossible, and record it in docs/LESSONS.md. Use when a net catches drift (a red gate, a
  failed deploy, a bug that escaped), when `scripts/incident-scan.mjs` names an unlearned incident,
  when something took far longer to notice than it should have, or when asked to "run a retro",
  "what did we learn", or "why did this slip through". Invokable as /retro.
---

# Retro — the learning drill

The *correction* half of the learning Coach. Its eye (`scripts/incident-scan.mjs` +
`incident-budget.json`, enforced by `tests/arch/lessons.spec.ts`) watches one dimension no other
coach watches: **how long a process gap goes unrecognized.** Every other gate looks at the code.
This one looks at us.

Blameless, always. The question is never "who missed it" — it is "what about the *system* made
missing it the likely outcome."

## 1. Take the incident (don't hunt for one)

```bash
node scripts/incident-scan.mjs --candidate     # oldest failed run on main with no lesson
node scripts/incident-scan.mjs                 # the full unlearned list
```

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
node scripts/incident-scan.mjs      # every incident on main now has a lesson
```

Land it with `/ship` (verify → REST open → one auto-merge call → stop). If the prevention was a new
gate, that gate's own budget starts at today's number and ratchets down from there.

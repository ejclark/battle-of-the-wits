# Gear — how much thinking this needs

Effort is not free, and it is not linear in value. A maximum-effort pass on a rename spends the one
resource this whole system treats as scarce — **the human waiting for it** — and buys nothing, because
there was no decision in the work to think about.

Run everything at the top of the ladder and you have optimised for the hardest 5% of the work at the
expense of every command in the other 95%. That is a real cost paid continuously, against a benefit
that arrives rarely.

So: **the standing default is low, and the ladder is climbed on evidence.**

---

## First, the mechanism — because it is not what it looks like

A session **cannot change its own model or effort mid-turn.** Those are user-driven controls. Any
doctrine that assumes otherwise is describing a machine that does not exist.

What a session *can* do is **dispatch at a chosen tier**. A subagent is spawned with its own model and
its own effort, which means the escalation path that actually works today is:

> **A cheap main loop that hands one hard step to an expensive subagent, and keeps the result.**

This is better than re-tiering the session even if re-tiering were possible, because it escalates the
**step** rather than the **session**. You pay deep-thinking prices for the part that needed it and
low prices for the twenty commands around it — which is the whole point, and a session-wide switch
could never do it.

The other half is that the human **can** re-tier, and should be told when to. A gear that is wrong for
the work is worth one line of output, not a silent mismatch.

---

## The trap this is built around

The obvious design is "let the session pick its own gear." It fails, and it fails in a specific way
worth naming, because the failure is invisible.

**Calibration — knowing what you do not know — is the first thing to degrade when effort comes down.**
So self-selection hands the decision to precisely the configuration whose judgment was just reduced.
And a cheap pass does not announce that it was out of its depth. It produces a confident answer that
is wrong in a way nothing catches.

That is this project's defining failure mode — the false green — wearing a new hat.

**So the gear is not a judgment call.** It is a function of things already on the record.

---

## The floor comes from evidence

Every signal below is an **observable**, not an assessment. None of them requires anyone to rate their
own depth, which is exactly why they can be trusted at low effort.

| Signal | Floor | What it is |
|---|---|---|
| `irreversible` | **deep** | The change touches workflows, credentials, or settings — preflight's refusal class |
| `refused` | **deep** | A preflight refusal already fired on this change |
| `regression` | **careful** | A test that passed before this edit does not pass now |
| `reverted` | **careful** | Second attempt at a change that was already backed out |
| `gateRedTwice` | **careful** | The cheap pass is not converging on its own |
| `thrashing` | **careful** | Tool calls accumulating with nothing written |
| `novel` | **careful** | No procedure exists yet, so there is nothing to execute |
| `drill` | **mechanical** | A written procedure — the thinking is done; running it is not thinking |
| `formatting` | **mechanical** | Rename, format, budget update, typo |

Two rules govern how they combine, and both matter:

1. **Anything that pulls up beats everything that pulls down.** A drill that has started regressing is
   not "somewhere in the middle" — it is a regression, and the mechanical half of the picture is now
   the stale half. Never average.
2. **Absence of evidence is not evidence the work is easy.** Nothing firing means nothing is known,
   and that resolves to `standard`, never to `mechanical`. The cheap rung has to be *earned* by a
   positive signal.

## The ceiling comes from headroom

Remaining API budget caps what any of this may spend. The limit is **account state** — true of one
person's plan, which has exactly the problem a budget true of one project has — so it arrives by
environment variable (`HARNESS_TOKEN_LIMIT`, `HARNESS_TOKEN_WINDOW_MS`) and never acquires a file.

Burn comes from the run ledger, so headroom is measured rather than guessed.

## And when the ceiling falls below the floor, it refuses

This is the safety property, and it is the only interesting line in the module.

The tempting behaviour is to return the affordable gear and let the work proceed. **Do not.** That
produces a finished-looking irreversible change made at a quality nobody was told about. Silently
downgrading is a false green — the work looks done, and the fact that it was done cheap is knowable to
nobody.

When you cannot afford to do something safely, the honest move is to say so and stop:

```
✗ not enough headroom to run this safely

    needs:    deep
    affords:  mechanical
    evidence: irreversible

  Wait for the window, raise HARNESS_TOKEN_LIMIT, or split the change so the
  part that needs deep stands alone.
```

**And never spend above what the evidence asked for just because the budget is there.** Unused
headroom is not waste; it is what pays for the next thing that genuinely needs deep.

---

## Why a low default is safe *here*, and the rule that generalises

It would be reckless in most repositories. The reason it is not reckless here is worth stating as a
rule rather than as a fact about this project:

> **The affordable default effort is inversely proportional to how much of the verification is
> automated.**

A cheaper worker is safe exactly to the degree that a machine checks the work. This repository has
ratcheting gates, a preflight with seven refusals, planted-violation tests, and a pre-push hook that
runs the full local suite. That net is what buys the low default — the gates are not overhead on the
speed, they are *the thing that makes the speed affordable*.

The corollary is the uncomfortable half: **a repository with no gates cannot afford a cheap default**,
and the fix is to build the net rather than to turn the effort up forever. Turning effort up is
renting the safety; building the gate is owning it.

## Getting back down

A system that only ratchets up ends expensive, so the descent matters as much as the climb:

- The gate goes green on the first run → the escalation is spent, drop back.
- The work reaches a written procedure → `drill`, and drop to mechanical.
- The escalated **step** finishes → the session was never re-tiered, so there is nothing to undo. That
  is the quiet advantage of escalating by dispatch: the return path is free.

## Using it

```sh
harness-gear                                        # what the evidence calls for now
harness-gear --signal regression --signal reverted  # after two failed attempts
harness-gear --json                                 # for a caller; exits 1 on a refusal
```

A misspelled signal is **reported, never dropped** — swallowing one yields a lower gear than the
evidence called for, which is the silent downgrade this whole file is built to prevent.

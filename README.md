# Battle of the Wits

A portable engineering harness for Claude Code — the quality system from
[`skynet-capital`](https://github.com/ejclark/skynet-capital), lifted out of the project it grew in so
it can run anywhere.

Distributed as a **Claude Code plugin marketplace**, so adopting it in a new repository is an install
rather than a port.

## Install

```shell
/plugin marketplace add ejclark/battle-of-the-wits
/plugin install harness-core@battle-of-the-wits
/plugin install harness-gates@battle-of-the-wits
/reload-plugins
```

Then, in any repository, ask for what you want in plain language — "run a governor cycle", "why did
CI fail", "let's do a retro on that" — or invoke the drills directly.

## What's in it

### `harness-core` — toolchain-agnostic

Works in any repository, in any language, with no configuration.

| Drill | What it does |
|---|---|
| `/harness-core:ears` | Turns a vague request into EARS-format requirements and scaffolds the matching specs. The upstream half of the BDD loop. |
| `/harness-core:retro` | Turns a failure into a banked lesson: timeline, root cause, detection lag, and the cheapest prevention that makes the drift impossible. |
| `/harness-core:governor` | One head-coach dispatch cycle — check WIP, take each gate's named target, dispatch an athlete in an isolated worktree, open its PR. |

### `harness-gates` — measures a codebase, so it needs to know its shape

| Gate (on `PATH` when enabled) | Dimension it defends |
|---|---|
| `harness-arch-scan` | God files — per-file line budgets that ratchet **down** as files shrink |
| `harness-dupe-scan` | The same symbol defined in N files |
| `harness-dead-scan` | Unused files, exports, and types |
| `harness-spec-gap-scan` | Source files no spec imports |
| `harness-clone-scan` | Copy-pasted blocks |
| `harness-incident-scan` | Incidents with no banked lesson |
| `harness-ship` | Land a verified branch as a PR the resource-cheap way |

Plus the drills that correct what the gates find (`/harness-gates:decompose`,
`/harness-gates:dedupe`, `/harness-gates:ship`) and the background athletes that run them
autonomously: `decomposer`, `ui-librarian`, `mortician`, `test-backfiller`.

## The one idea worth understanding

Every gate is a **ratchet, not a rule**. It measures today's debt, freezes it as a budget, and refuses
to let it grow — then lowers the budget every time the debt shrinks. Nothing is ever blocked on a
flag-day cleanup, and improvement is permanent because the budget can only move one direction.

This is what makes autonomy safe rather than reckless: *automerge everything but breaking changes* is
a terrible idea unguarded, and a very good one once the verification underneath it is real. The gates
are that verification. See [`docs/COACHES.md`](docs/COACHES.md).

## Configuration

Most repositories need none. If yours doesn't use `src/` and `tests/`, add a `harness.json` at its
root — see [`docs/DESCRIPTOR.md`](docs/DESCRIPTOR.md).

Budgets (`arch-budget.json` and friends) live in the **target** repo, because they are that repo's
state, not the harness's. The harness carries the procedure; the repo carries its own history.

## Docs

| | |
|---|---|
| [`docs/COACHES.md`](docs/COACHES.md) | The detect-and-correct doctrine — the coaching staff, the codification ladder, detection lag, the smell catalog |
| [`docs/ENGINEERING.md`](docs/ENGINEERING.md) | Engineering standards, change communication, the BDD loop |
| [`docs/OPERATING-MODEL.md`](docs/OPERATING-MODEL.md) | The portable operating model — how a human and Claude divide work |
| [`docs/DESCRIPTOR.md`](docs/DESCRIPTOR.md) | `harness.json` — the interface that makes all of the above portable |

## Status

Early. The plugins install and the gates run against a real repository, but this has been proven in
exactly one codebase so far. The honest test of a portable system is expressing it somewhere it did
not grow — until that has happened more than once, treat "portable" as a claim rather than a fact.

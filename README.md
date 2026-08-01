# Battle of the Wits

A portable engineering harness for Claude Code — the quality system from
[`skynet-capital`](https://github.com/ejclark/skynet-capital), lifted out of the project it grew in so
it can run anywhere.

Distributed as a **Claude Code plugin marketplace**, so adopting it in a new repository is an install
rather than a port.

## Install

```shell
/plugin marketplace add ejclark/dungeon-crawler
/plugin install harness-core@dungeon-crawler
/plugin install harness-gates@dungeon-crawler
/reload-plugins
```

Then drop the whole engineering process into the repo:

```shell
harness-bootstrap --dry-run   # see the plan
harness-bootstrap             # write it
```

That writes the CI pipeline, Conventional Commits + commitlint, semantic-release, Biome, the git
hooks, the capability descriptor, the lessons ledger, and the quality gates wired **into your test
suite** — then merges the scripts and dev dependencies into your `package.json` without touching
anything you already had. It never clobbers an existing file, and it prints exactly which opinions
it just imposed.

After that, ask for what you want in plain language — "run a governor cycle", "why did CI fail",
"let's do a retro on that" — or invoke the drills directly.

## What's in it

### `harness-core` — toolchain-agnostic

Works in any repository, in any language, with no configuration.

| Drill | What it does |
|---|---|
| `/harness-core:dungeon` | **The dominant persona.** Where you are, the bosses, the locked loot, the fog — read from measured state. `--today` answers *what should I build?* with campaigns that each state what clearing them buys; `--new` lists the raw encounters. |
| `harness-map` | Renders the ADR history as a **dungeon map** — cleared rooms, bosses standing, unlit regions — to a standalone HTML file. |
| `harness-city` | Renders the codebase as an **isometric city** — districts are directories, buildings are files, height is lines, colour is standing against budget. Answers *where is the weight, and where is the risk?* at a glance. |
| `/harness-core:bootstrap` | The one-shot — drops the entire process (CI, commits, releases, lint, hooks, gate wiring, ledger) into a repository. Never clobbers; declares what it imposes. |
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
| `harness-dispatch` | **The bracket every athlete runs inside** — acquire a slot and territory together (all-or-nothing), then release both. |
| `harness-fleet` | **WIP cap, kill switch, token ceiling** — what makes "tokens to burn" safe to act on. |
| `harness-preflight` | **Blast-radius refusal** — workflow files, credentials, raised budgets, work on the default branch, and edits outside claimed territory. Turns doctrine into a gate. |
| `harness-claim` | **Territory claims** — an athlete registers the paths it holds; overlapping dispatch is refused. The rail that lets agents run in parallel without colliding. |

Plus the drills that correct what the gates find (`/harness-gates:decompose`,
`/harness-gates:dedupe`, `/harness-gates:ship`) and the background athletes that run them
autonomously: `decomposer`, `ui-librarian`, `mortician`, `test-backfiller`.

## The one idea worth understanding

Every gate is a **ratchet, not a rule**. It measures today's debt, freezes it as a budget, and refuses
to let it grow — then lowers the budget every time the debt shrinks. Nothing is ever blocked on a
flag-day cleanup, and improvement is permanent because the budget can only move one direction.

This is what makes autonomy safe rather than reckless: *automerge everything but breaking changes* is
a terrible idea unguarded, and a very good one once the verification underneath it is real. The gates
are that verification. See [`COACHES.md`](plugins/harness-core/docs/COACHES.md).

## Configuration

Most repositories need none. If yours doesn't use `src/` and `tests/`, add a `harness.json` at its
root — see [`DESCRIPTOR.md`](plugins/harness-core/docs/DESCRIPTOR.md).

Budgets (`arch-budget.json` and friends) live in the **target** repo, because they are that repo's
state, not the harness's. The harness carries the procedure; the repo carries its own history.

## Docs

| | |
|---|---|
| [`COACHES.md`](plugins/harness-core/docs/COACHES.md) | The detect-and-correct doctrine — the coaching staff, the codification ladder, detection lag, the smell catalog |
| [`ENGINEERING.md`](plugins/harness-core/docs/ENGINEERING.md) | Engineering standards, change communication, the BDD loop |
| [`OPERATING-MODEL.md`](plugins/harness-core/docs/OPERATING-MODEL.md) | The portable operating model — how a human and Claude divide work |
| [`DESCRIPTOR.md`](plugins/harness-core/docs/DESCRIPTOR.md) | `harness.json` — the interface that makes all of the above portable |

**The doctrine ships inside `harness-core`**, not just in this repository — an adopter installs
plugins, they don't clone this repo, so doctrine that lived only at the root is doctrine they would
never receive. A gate asserts it stays that way, and that no second copy appears.

## Working on the harness itself

```shell
npm ci
npm test                              # the portability suite
npm run validate                      # marketplace + plugin manifests
npm run check-versions           # no committed versions in manifests
```

CI runs all of the above plus `claude plugin validate` and shellcheck on every PR. Merging to `main`
runs `semantic-release`, which tags the release and writes its notes.

**Plugin manifests deliberately carry no `version`.** `main` is protected by a ruleset requiring pull
requests, so the release cannot push a bump commit back — a committed version would drift from the
tag silently. Claude Code falls back to the commit SHA when the field is absent, so installs still
update; they just track commits rather than semver. See [`CLAUDE.md`](CLAUDE.md) for the rules a new
gate has to satisfy.

## Status

Early, and honest about it. The plugins validate, the gates run, and the portability suite passes —
but this has been proven in exactly one codebase. The real test of a portable system is expressing it
somewhere it did not grow; until that has happened more than once, treat "portable" as a claim rather
than a fact.

The suite has already earned its keep: lifting the harness out carried three project-specific
accidents with it — hardcoded `src/` prefixes, spec exemptions that only made sense for a WebGL app,
and a crash when `knip` wasn't installed. All three were invisible until a test demanded the gates
work somewhere else.

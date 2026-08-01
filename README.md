# Battle of the Wits

A portable engineering harness for Claude Code — the quality system from
[`skynet-capital`](https://github.com/ejclark/skynet-capital), lifted out of the project it grew in so
it can run anywhere.

Distributed as a **Claude Code plugin marketplace**, so adopting it in a new repository is an install
rather than a port.

## Start here

**Setting up a new project?** One block, copy-paste, in a Claude Code session opened on your repo:

```shell
/plugin marketplace add ejclark/dungeon-crawler
/plugin install harness-core@dungeon-crawler
/plugin install harness-gates@dungeon-crawler
/reload-plugins
harness-bootstrap --auto
```

That is the whole of day one. **This command never changes and never needs to** — the plugins carry
no version field, so it always resolves to the latest published state. There is no "latest install
command" to keep in sync, which is deliberate: a versioned setup command is a second place for the
truth to live, and it goes stale the day after it is written.

`--auto` writes the toolchain, installs the git hooks, **freezes today's debt as the starting
budgets**, verifies, and commits — then stops before pushing, because everything up to that point is
local and reversible. It never clobbers a file you already have, and it prints exactly which
opinions it just imposed. Use `harness-bootstrap --dry-run` first if you want to see the plan.

Three things need your repository-admin credentials afterwards and cannot be automated from here;
the run names them precisely when it finishes. For a guided walkthrough including creating the
repository itself, ask for **`/harness-core:launch`**.

**Never used git, or joining an existing project?** → **[`CONTRIBUTING.md`](CONTRIBUTING.md)**. It
assumes no prior experience, needs no terminal, and everything on it happens in the browser.

**Not sure what you are looking at?** Ask for **`/harness-core:orient`** and it will work out whether
you want the tour, want to dump ideas, or have something specific in mind — and say which it picked.

## Staying current — day two

**The procedure updates itself; your configuration is yours to keep.** That split is the one rule
this project runs on, and it falls out cleanly:

| | Travels with `/plugin update` | Written into your repo once |
|---|---|---|
| | 8 doctrine docs · 13 drills · 8 agents · 37 scanner modules | `biome.json`, the pipeline, the git hooks, `harness.json`, the budgets |
| | **always current** — no version pinning, nothing to migrate | **yours** — the harness will not clobber what you may have customised |

So the gates, the drills, the agents and every word of doctrine reach you automatically. Run
`/plugin update` and you are on the latest.

**The honest gap:** the harness cannot yet tell a config file you *customised* from one that is
merely *old*, so it treats every one as customised and leaves it alone. That is the safe direction,
and it means a template improvement will not reach an existing adopter until it can be distinguished.
The fix is tracked as idea #29 — record a checksum at write time — and it is the prerequisite for
anything automatic. Until then, `harness-bootstrap --dry-run` shows what a fresh install would write,
and the diff is yours to take or ignore.

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

## Everything else — the table of contents

Detail lives in folders. This is the map.

**For people**

| | |
|---|---|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | The on-ramp. No git needed, browser only, and the loop that answers *what do I work on?* |
| [`CONTRIBUTORS.md`](plugins/harness-core/docs/CONTRIBUTORS.md) | Human vs. agent principals, earned standing, zoning, the worst-case catalog, the dignity rule |
| [`DECIDING.md`](plugins/harness-core/docs/DECIDING.md) | The north stars — Theory of Constraints, the Three Ways, constraint succession, what data can claim |

**How the system thinks**

| | |
|---|---|
| [`COACHES.md`](plugins/harness-core/docs/COACHES.md) | The detect-and-correct doctrine — coaching staff, the codification ladder, the foreman tier, detection lag |
| [`METAPHORS.md`](plugins/harness-core/docs/METAPHORS.md) | The load-bearing metaphors catalog + rubric — skin vs. skeleton, and where each one breaks |
| [`ENGINEERING.md`](plugins/harness-core/docs/ENGINEERING.md) | Engineering standards, the BDD loop, why commit size is a sampling rate |
| [`OPERATING-MODEL.md`](plugins/harness-core/docs/OPERATING-MODEL.md) | The portable operating model — how a human and Claude divide work |

**Reference**

| | |
|---|---|
| [`DESCRIPTOR.md`](plugins/harness-core/docs/DESCRIPTOR.md) | `harness.json` — the interface that makes all of this portable |
| [`DISPATCH.md`](plugins/harness-gates/docs/DISPATCH.md) | The bracket every background agent runs inside |
| [`LESSONS.md`](docs/LESSONS.md) | The incident ledger — every lesson paid for, with its prevention |
| [`IDEAS.md`](docs/IDEAS.md) | Everything banked and not built, ranked by how many other ideas point at it |
| [`JOURNAL.md`](docs/JOURNAL.md) | The long-form record of how this got here |

**Drills** — ask for any of these in plain language, or invoke directly

| | |
|---|---|
| `/harness-core:orient` | Works out which gear you are in, and says so |
| `/harness-core:launch` | New project — repository, pipeline, gates, the admin handover |
| `/harness-core:onboard` | A new human contributor, nothing to merged, no terminal |
| `/harness-core:profile` | Their own GitHub profile — the safest first git exercise |
| `/harness-core:intake` | Turn raw feedback into a banked, falsifiable observation |
| `/harness-core:retro` | Turn a failure into a prevention, at a fault line |
| `/harness-core:ears` | Turn a wish into a requirement that can be verified |
| `/harness-core:governor` | One head-coach dispatch cycle |
| `/harness-gates:decompose`, `:dedupe`, `:ship` | The corrective drills |

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

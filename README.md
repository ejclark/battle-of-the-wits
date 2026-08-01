# dungeon-crawler

A portable engineering harness for Claude Code: ratcheting quality gates, corrective drills, and
background agents that burn structural debt down. Distributed as a **plugin marketplace**, so
adopting it is an install rather than a port.

---

## Start here

**Joining this project, or new to git?** → **[`CONTRIBUTING.md`](CONTRIBUTING.md)**
No terminal, no prior experience, everything happens in the browser.

**Setting up your own project?** Paste this into a Claude Code session opened on your repo:

```shell
/plugin marketplace add ejclark/dungeon-crawler
/plugin install harness-core@dungeon-crawler
/plugin install harness-gates@dungeon-crawler
/reload-plugins
harness-bootstrap --auto
```

That is all of day one. **This command never changes and never needs to** — the plugins carry no
version field, so it always resolves to the latest published state.

**Not sure what you are looking at?** Ask for `/harness-core:orient`.

---

## Where everything is

Detail lives in folders; this is the map. Nothing below is needed to start.

**For people**

| | |
|---|---|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | The on-ramp, and the loop that answers *what do I work on?* |
| [`CONTRIBUTORS.md`](plugins/harness-core/docs/CONTRIBUTORS.md) | Human vs. agent principals, earned standing, zoning, the worst-case catalog |
| [`DECIDING.md`](plugins/harness-core/docs/DECIDING.md) | The north stars — Theory of Constraints, the Three Ways, what data can claim |

**How the system thinks**

| | |
|---|---|
| [`COACHES.md`](plugins/harness-core/docs/COACHES.md) | Detect-and-correct doctrine — the coaching staff, the codification ladder, detection lag |
| [`METAPHORS.md`](plugins/harness-core/docs/METAPHORS.md) | The metaphor catalog + rubric — skin vs. skeleton, and where each one breaks |
| [`ENGINEERING.md`](plugins/harness-core/docs/ENGINEERING.md) | Standards, the BDD loop, why commit size is a sampling rate |
| [`GEAR.md`](plugins/harness-core/docs/GEAR.md) | How much thinking a task needs — evidence sets the floor, budget sets the ceiling |
| [`OPERATING-MODEL.md`](plugins/harness-core/docs/OPERATING-MODEL.md) | How a human and Claude divide work |

**Reference**

| | |
|---|---|
| [`DESCRIPTOR.md`](plugins/harness-core/docs/DESCRIPTOR.md) | `harness.json` — the interface that makes this portable |
| [`DISPATCH.md`](plugins/harness-gates/docs/DISPATCH.md) | The bracket every background agent runs inside |
| [`LESSONS.md`](docs/LESSONS.md) · [`IDEAS.md`](docs/IDEAS.md) · [`JOURNAL.md`](docs/JOURNAL.md) | Incidents with preventions · what is banked and unbuilt · the long record |

**Drills** — ask in plain language, or invoke directly

`/orient` which gear you are in · `/launch` new project · `/onboard` a new contributor ·
`/spark` no idea what to build · `/profile` their own GitHub profile · `/intake` feedback into a
banked observation · `/retro` failure into prevention · `/ears` wish into requirement ·
`/governor` one dispatch cycle · `/decompose` `/dedupe` `/ship`

---

<details>
<summary><b>Why "Battle of the Wits"</b></summary>

The name the operating model goes by. A codebase and the entropy in it are genuinely adversarial —
every convenient shortcut, every silent assumption, every *we'll clean that up later* is a move — and
the harness is the other side of that board. It does not out-work the mess; it out-thinks it, by
refusing to measure anything dishonestly and by making every improvement permanent.

Which is why the surfaces are a dungeon, a city and a crossing rather than a dashboard. See
[`METAPHORS.md`](plugins/harness-core/docs/METAPHORS.md) for which are load-bearing and which are only
flavour — a test enforces the difference.

The system it grew out of is [`skynet-capital`](https://github.com/ejclark/skynet-capital); this is
that system lifted out of the project it grew in so it can run anywhere.

</details>

<details>
<summary><b>What the two plugins contain</b></summary>

**`harness-core`** — toolchain-agnostic. The drills, the doctrine, the bootstrap, and the visual
surfaces (`harness-dungeon`, `harness-map`, `harness-city`). Works in any repository, any language.

**`harness-gates`** — measures a codebase, so it needs to know its shape. Scanners for file size,
duplication, clones, dead code and the spec gap; the blast-radius preflight; territory claims; fleet
control; the run ledger; and the background athletes that burn debt down.

Every gate follows four rules: it reads paths from `harness.json` rather than assuming a layout, it
**grandfathers** today's debt rather than demanding a flag-day cleanup, it **ratchets one direction
only**, and it **degrades honestly** — a dimension it cannot measure is reported as unmeasured, never
as a pass.

Most repositories need no configuration. If yours does not use `src/` and `tests/`, add a
`harness.json` — see [`DESCRIPTOR.md`](plugins/harness-core/docs/DESCRIPTOR.md). Budgets live in the
target repo, because they are that repo's state: **the harness carries the procedure, the repo
carries its own history.**

</details>

<details>
<summary><b>Staying current, and where updates stop</b></summary>

**The procedure updates itself; your configuration stays yours.**

| Travels with `/plugin update` | Written into your repo once |
|---|---|
| doctrine, drills, agents, every scanner | `biome.json`, the pipeline, git hooks, `harness.json`, budgets |
| always current — nothing to pin, nothing to migrate | yours — never clobbered |

**The honest gap:** the harness cannot yet tell a config file you *customised* from one that is
merely *old*, so it treats every one as customised and leaves it alone. Safe direction, real
limitation, tracked as idea #29. Meanwhile `harness-bootstrap --dry-run` shows what a fresh install
would write, and the diff is yours to take or ignore.

</details>

<details>
<summary><b>Working on the harness itself, and its honest status</b></summary>

```shell
npm install
npm run verify     # validate + version check + the full suite, including the gates
```

`tests/portability.test.mjs` is the load-bearing suite. It builds a throwaway repo with a deliberately
non-default layout and requires each gate to catch a **planted** violation — because a scanner aimed
at a directory that does not exist finds no problems and exits 0, which is a false green
indistinguishable from success. **Adding a gate means adding its planted-violation case.**

Plugin manifests carry no `version` field and a gate enforces it: `main` is protected by a ruleset
requiring pull requests, so a release cannot push a bump commit back, and a committed version would
drift from the tag silently. Claude Code uses the commit SHA when the field is absent.

**Status: early, and honest about it.** Proven in exactly one codebase. The real test of a portable
system is expressing it somewhere it did not grow, and until that has happened more than once
"portable" stays a claim.

</details>

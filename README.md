# dungeon-crawler

**Writing code got cheap. Checking it did not.** That gap is the whole problem this solves.

When a machine can produce a thousand lines in a minute, the only thing between you and a codebase
you no longer trust is how much of the checking happens without you. This is that checking — and it
**refuses to lie to you**: a gate that cannot measure something says so rather than passing, because
a false green is worse than a red.

Any repository, any language. Adoption is an install, not a port.

```
  ⛬  THE DUNGEON — your-project
     depth 2 of 5   ·   The Frozen Vault

  ▸ CURRENT CHAMBER — The Frozen Vault
      → Confirm the full gate passes locally
        npm run verify

  ▸ BOSSES                                    ← your largest files, from committed budgets
      ☠ src/checkout/session.ts   (298 lines)
      ☠ src/billing/invoice.ts    (240 lines)

  ▸ LOOT — capability, earned by clearing
      ✦ Ratcheting gates              ✦ The full local gate (pre-push)
      · Merge-on-green   — locked, clear The Warden's Gate
      · Autonomous athletes   — locked, clear The Throne
```

Nothing there is flavour: bosses are real files over budget, loot is capability you actually unlock.

---

## Get started

**Open a Claude Code session on your repo and paste this. It does the rest.**

```
Set up the dungeon-crawler engineering harness in this repository.

Assume I am new to this and check things rather than assuming them:

1. This needs Node and git. If either is missing, tell me what it is for and help me
   install it before going further.
2. If this folder is not a git repository yet, say so and set one up — the pipeline
   and the hooks cannot do anything without one.
3. Get a copy of https://github.com/ejclark/dungeon-crawler (clone it, or download it
   if that is easier) into a temporary folder outside this project.
4. Run its plugins/harness-core/lib/bootstrap.mjs with node, from here.

Then tell me plainly: what it wrote, what opinions it imposes, anything that failed
and whether that failure was mine or its, and what is left that only I can do.
```

**It needs Node and git**, and the paste checks for both rather than assuming — because a missing
tool fails with an error that reads like your mistake. Neither is a dungeon-crawler thing: Node runs
the harness, git is what a pipeline is built on. If you have neither, you are five minutes from
having both.

That is all of day one — pipeline, hooks, formatter, gate wiring, budgets frozen at today's debt. It
never clobbers a file you already have, and it names every opinion it imposes. Nothing is pushed and
nothing is irreversible; `--dry-run` shows the plan and touches nothing.

**Plain English on purpose.** Slash commands are not available on every Claude Code surface — if you
have ever seen *"/plugin isn't available in this environment"*, that is why. The paste above works
wherever Claude Code does.

<details>
<summary>Have the CLI? Install the plugins instead — the drills stay available afterwards.</summary>

```shell
/plugin marketplace add ejclark/dungeon-crawler
/plugin install harness-core@dungeon-crawler
/plugin install harness-gates@dungeon-crawler
/reload-plugins
harness-bootstrap --auto
```

Same result, plus every drill below stays on tap in future sessions rather than only during setup.

</details>

<details>
<summary><b>Already have a copy, and it is out of date or something went wrong?</b></summary>

Do not try to work out the git commands. Paste this into a Claude Code session opened on the folder:

```
I have a copy of dungeon-crawler that is out of date or in a bad state — I may have
downloaded it as a zip rather than cloning it.

Work out whether my folder can be brought up to date or whether a fresh copy is
cleaner and safer, tell me which you picked and why, then do it. Keep anything I
have actually changed. Afterwards run the install and the checks, and show me the
result plainly.
```

It will look at what you have rather than assuming, and say what it did. **A zip download is not a
clone** — it has no connection to the original, so "just pull" often cannot work, and that is a
property of the download and not a mistake you made.

</details>

**Contributing here instead?** [`CONTRIBUTING.md`](CONTRIBUTING.md) takes you from nothing to a
merged change entirely on github.com — no install, no terminal, no git. **If anything above did not
work for you, start there**: it is a complete path, not a consolation prize.

**Everything else is below, closed and optional:** [the map](#map) · [the name](#name) ·
[the two plugins](#plugins) · [staying current](#updates) · [working on it](#developing)

---

<details id="map">
<summary><b>Where everything is</b></summary>

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
| [`THEORIES.md`](plugins/harness-core/docs/THEORIES.md) | Borrowed theory as hypotheses with falsifiers — what holds, what shifted, what is untested |
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

**Hit a harness defect?** `harness-report` composes a complete issue from files already on your
disk — zero tokens, nothing transmitted, you press the button.

</details>

<details id="name">
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

<details id="plugins">
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

<details id="updates">
<summary><b>Staying current, and where updates stop</b></summary>

**Neither paste command ever changes and neither needs to** — the plugin manifests carry no version
field, so they always resolve to the latest published state. Claude Code tracks them by commit SHA.

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

<details id="developing">
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

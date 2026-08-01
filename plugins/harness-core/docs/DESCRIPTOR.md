# The capability descriptor — `harness.json`

The one interface that makes everything else portable. A target repository declares **what it is and
how to work on it**; the harness assumes nothing else.

## Why this file exists

Four separate ideas independently demanded the same artifact, which is how we knew it was the real
work rather than one of the four:

1. **Portability** — lifting the operating model requires knowing where the model ends and the project
   begins.
2. **Comparability** — you cannot run the same task suite against two systems until both describe
   themselves the same way.
3. **Harness themes** — swapping vocabulary over an invariant core requires the core to be defined.
4. **Replication** — a bootstrap that copies *everything* ports the accidents along with the essentials.

The failure mode this prevents has a name in these docs: **the Jurassic Park gap-filler.** Reconstruct
a system from a partial description and the destination environment quietly fills the gaps — you get
something that runs, but not the thing you meant. Every gap here is therefore *explicit*: either the
repo declares a value, or it takes a documented default. Nothing is inferred.

## Placement

`harness.json`, at the root of the **target** repository (the one being worked on) — not in this repo.

A conventional TypeScript project needs no file at all; the defaults below already describe it.

## Schema

| Key | Default | Meaning |
|---|---|---|
| `sourceDir` | `"src"` | Root of first-party source. Everything the gates measure lives under it. |
| `testDir` | `"tests"` | Root of the test tree. |
| `sourceExt` | `".ts"` | Extension identifying a source file. |
| `specSuffix` | `".spec.ts"` | Suffix identifying a spec file, used to pair specs to sources. |
| `specExempt` | `[]` | Paths with no honest unit assertion available (CLI mains, fixture data, GPU-bound render code). Defaults to empty on purpose — an exemption the adopter didn't ask for is a silently lowered bar. |
| `exclude` | `[]` | Path prefixes that are **not first-party source**: fixtures, generated output, templates. Measuring a template inflates every number and reports two deliberate variants of one file as duplication. |
| `fleet.maxConcurrent` | `3` | How many athletes may run at once. The cap exists because parallel work stops paying once *review* capacity binds — more agents past that point just produce more PRs competing for the same attention. |
| `fleet.tokenCeiling` | `null` | Total tokens the fleet may burn before new starts are refused. `null` means no ceiling — the harness must not invent a limit the repo never asked for. |
| `persona` | `"dungeon"` | The active harness persona shown in the status line: `dungeon` · `coach` · `orchestra` · `corporate` · `startup` · `senate`. |

### Example

```json
{
  "sourceDir": "lib",
  "testDir": "spec",
  "sourceExt": ".js",
  "specSuffix": ".test.js"
}
```

## Budgets live in the target repo, not here

Each gate keeps a committed budget file at the target repo root — `arch-budget.json`,
`dupe-budget.json`, `dead-budget.json`, `spec-gap-budget.json`, `incident-budget.json`. These are
**repo state, not harness config**: they record that repo's current debt and ratchet **down only**, so
a repo's history of improvement stays with the repo. Run any scanner with `--update` to re-ratchet
after a cleanup.

This split is the whole portability story in one sentence: **the harness carries the procedure, the
repo carries its own state.**

## What is deliberately *not* in the descriptor

Verification commands (`typecheck`, `lint`, `test`) are **not** declared here yet. They are the
obvious next field, and they are omitted on purpose: nothing in this version shells out to them, and a
descriptor key that nothing reads is a promise the harness does not keep. Add the key in the same
change that adds the reader.

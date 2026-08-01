# Engineering practices

The non-negotiables. They exist so a codebase can grow without turning into a swamp, and so a
change is cheap to make in year two rather than only in week one. Every PR is held to them.

These are **portable** — nothing here names a language, a framework, or a directory that only one
project has. Where a concrete example makes a rule land, it is marked as an example rather than
written as though it were the rule.

## Architecture decisions

Significant, hard-to-reverse decisions — a new host, an auth model, a data-flow seam, a CI/CD
pipeline — are recorded as **Architecture Decision Records** in `docs/adr/`. When a PR makes such a
decision, the ADR lands in the same PR. Routine changes do not need one.

The test for "significant" is not size. It is **reversibility**: if undoing it in six months would
mean a migration rather than a revert, write it down while the reasoning is still in someone's head.

## The compiler is the first test

Whatever the language, turn its checking up as far as it goes and leave it there. Types are the
cheapest documentation and the earliest failing test — the ones you get without writing anything.
A setting that catches a class of bug for free is worth more than a lint rule someone has to
remember, and far more than a convention someone has to enforce in review.

## Test-driven, behaviour-driven

- **TDD:** write the failing spec first, then the code that makes it pass. Tests are not an
  afterthought — they are how the interface gets designed. The first caller of a function should be
  a test, because that is when a bad signature is still free to change.
- **BDD, not implementation testing:** specs assert **observable behaviour** — what the unit
  returns, what it emits, what state a caller can see — never private fields or call counts. This
  is what makes refactoring safe: a suite that pins internals turns every improvement into a
  rewrite of the tests.
- Spec structure mirrors behaviour: `describe("when <situation>") → it("<expected behaviour>")`.

### Requirements in EARS — the upstream half of BDD

Before the failing spec, state the **requirement** in **EARS** (Easy Approach to Requirements
Syntax). One requirement per statement, a **named system**, a single **verifiable** response, the
word **shall**. Five patterns cover almost everything; reach for the simplest that fits:

| Pattern | Template | Cue |
|---|---|---|
| **Ubiquitous** (always true) | `The <system> shall <response>.` | — |
| **Event-driven** | `WHEN <trigger>, the <system> shall <response>.` | WHEN |
| **State-driven** | `WHILE <state>, the <system> shall <response>.` | WHILE |
| **Unwanted behaviour** | `IF <condition>, THEN the <system> shall <response>.` | IF/THEN |
| **Optional feature** | `WHERE <feature is present>, the <system> shall <response>.` | WHERE |
| **Complex** | combine, e.g. `WHILE <state>, WHEN <trigger>, the <system> shall <response>.` | — |

**EARS *is* the BDD grammar, one layer up**, and the mapping is mechanical — which is the whole
reason to adopt it. The `WHEN/WHILE/IF/WHERE` clause becomes the `describe("when …")`, and the
`shall <response>` becomes the `it("<response>")`. One EARS line ⇒ one spec.

> **EARS:** `WHEN a claim overlaps territory another athlete holds, the dispatcher shall refuse it.`
> **Spec:** `describe("when the territory is already held") → it("refuses the dispatch")`.

Write EARS acceptance criteria in plans, issues, and PRs; `/harness-core:ears` classifies a raw
request into these patterns and scaffolds the matching specs.

Anti-patterns EARS kills: vague *should / support / handle*, compound requirements (one `shall` per
line), and unverifiable responses — if a spec cannot assert it, rewrite the requirement.

### Make the loop run itself

The red-green-refactor loop should not depend on anyone remembering. Back it with **hooks** in the
project's `.claude/settings.json` so the suite runs deterministically:

- **PostToolUse** — on every source edit, run typecheck + tests and feed any failure straight back
  into context. Non-blocking: a safety net for the green and refactor phases, not a gate.
- **Stop** — an end-of-turn backstop; typecheck + tests + lint, warning if the turn left anything
  red.

Hooks are code execution, so they live in the **project's** settings rather than being shipped by a
plugin. Write them deliberately, and read one before you install it.

## DRY, with a bias toward one owner per concept

The rule is not "never repeat a line." It is **one owner per idea**. A concept with two owners does
not stay in sync; it drifts, and the drift is invisible until the two disagree in production.

- A calculation that more than one caller needs lives in exactly one module, and everyone calls it.
  Nobody re-derives it locally "just for here."
- A cross-cutting rule — a limit, a permission, a validation — is enforced at **one** chokepoint
  that every path goes through, not re-checked by each caller. Add a rule there and every caller
  inherits it.
- Derived data is computed where it is owned, not recomputed by each consumer.

The duplication gate (`harness-dupe-scan`) exists to make the drift visible. Note what it cannot do:
it can be argued *out* of a finding as easily as into one, and the argument that wins is the one
that sounds like architecture. A rationale nobody has tested is not a rationale.

## Decomposition — explicitly named modules, no dumping grounds

A generic `utils` module becomes a junk drawer: it does everything, so it is safe to change nowhere.
`harness-arch-scan` blocks the name outright for new files.

- Helpers live in the **explicitly named module they belong to**, named for the job they do.
- If a helper has no obvious named home, that is a signal the concept it serves **has not been named
  yet**. Name it and give it a file; do not file it under "utils."
- Folder structure encodes the architecture, so structure alone tells a newcomer where behaviour
  lives. A directory listing should be a table of contents, not an inventory.

## Depend on interfaces at the boundary

Core logic depends on **interfaces**, never on a concrete database, vendor, or transport. That is
what lets the same core run against an in-memory fake in tests and a real backend in production with
no change to the logic under test. A new vendor is a new adapter and nothing else.

The practical test: if swapping a vendor means editing files that have nothing to do with that
vendor, the boundary is in the wrong place.

## Change communication — commits and PRs are documents

Commits and pull requests are the project's durable record: how a non-author — a teammate, a future
agent, yourself in six months — reconstructs *what changed and why*. Assume some readers are
**analytical but non-technical**: they think like engineers without the formal background. Write for
them. Structure follows the inverted pyramid: **most important first, the weeds below the fold.**

**Commits.** [Conventional Commits](https://www.conventionalcommits.org) (enforced by commitlint),
lowercase-led subject, imperative mood — "add", not "added" — the classic
[Chris Beams rules](https://cbea.ms/git-commit/). The subject says *what*; the body says *why* and
any non-obvious *how*. One logical change per commit; in-PR commits are working granularity that
helps a reviewer navigate before merge.

**If squash-merge is configured to use the PR title and description** — the default this harness
assumes — then on the default branch the **PR description becomes the squash commit's body**, and
`semantic-release` analyses it. Two consequences: the **PR title must be a valid Conventional-Commit
subject**, because it becomes the commit subject and drives the version bump; and the **PR
description, not the in-PR commit bodies, is the durable record**. Write it as the thing a future
reader will `git log`.

**PRs — a document with a fold:**

1. **Summary** — the gist in plain language, skimmable by a non-technical reader: what ships.
2. **Why** — the intent and the value, in a sentence or two.
3. **Details, below the fold** (`<details>`) — the file-level walkthrough, design trade-offs (link an
   ADR for hard-to-reverse calls), verification, risk and rollback, follow-ups. The weeds live here
   so the top stays legible, and the depth is one click away for whoever wants it.

**Quality bar — succinct and high-signal.** The description is the commit body; make every line earn
its place:

- **Lead with the outcome, not the process.** The first line is what is *true after merge*, in plain
  language a non-technical reader skims in ten seconds.
- **Do not restate the diff.** The diff already shows which lines changed; the description says why
  it matters and what it enables. Cut any bullet that just narrates code.
- **One to three Summary bullets.** If the Summary needs more, it is probably two PRs — or a batched
  suite whose bullets should each name a shipped capability, not a step.
- **No filler, no hedging.** Drop "this PR does…", "various improvements", "as requested". Name the
  *one* non-obvious decision, not every obvious one.
- **A diagram only when a structure is faster seen than read.** Skip it when a sentence is clearer.

Keep it proportional: a one-line typo fix gets a one-line description, not a populated template.
A template is a layout to populate, not a checklist to satisfy.

### Changes to the standard itself clear a higher bar

Suggestions about *how information is presented* — clearer summaries, better templates, naming — are
welcome from anyone. But an edit to the **shared communication standard itself** (this section, the
PR template, the commit convention) changes everyone's environment, so it clears a higher review bar
than a feature would. A well-meaning but muddying change quietly pollutes the record for every
future reader, and unlike a bad feature it is never obviously wrong at the time.

## Releases and a protected default branch

`semantic-release` runs on every push to the default branch: it works out the next version from the
Conventional-Commit history and creates the **git tag and release**.

**Do not have it push the version bump back.** If the branch is protected — and it should be — a
direct push is correctly rejected (`GH006`/`GH013`: *changes must be made through a pull request*),
and the failure mode is nasty: the release job goes red *after* the merge, so nothing blocks and
nobody is watching. Two mechanisms, each right on its own, that deadlock when composed.

The consequence to accept deliberately: **the tag is the version of record**, and the committed
version field will lag or be absent. Say so in the repository's README, so a missing version reads
as a decision rather than an oversight.

To restore a committed bump, the release identity needs a branch-protection bypass — a governance
change, and therefore a human's call, not a tool's.

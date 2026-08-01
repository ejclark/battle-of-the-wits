# Engineering Practices — Skynet Capital

These are the non-negotiables. They exist so the codebase scales to many personas and a
live dashboard without turning into a swamp. Every PR is held to them.

## Architecture decisions

Significant, hard-to-reverse decisions (a new host, an auth model, a data-flow seam, a CI/CD
pipeline) are recorded as [Architecture Decision Records](adr/README.md) in `docs/adr/`. When a
PR makes such a decision, add an ADR in the same PR. Routine changes don't need one.

## Stack

| Concern | Tool | Why |
|---|---|---|
| Language | TypeScript (strict, ESM) | Types are the cheapest documentation and the first test. |
| Lint + format | [Biome](https://biomejs.dev/) | One fast tool, zero-config drift. `npm run lint` / `lint:fix`. |
| Unit / BDD tests | [Rstest](https://rstest.rs/) (`@rstest/core`) | Fast, Vitest-compatible API, globals on. `npm test`. |
| Browser / E2E / autonomous scripting | [Playwright](https://playwright.dev/) | Reserved for the dashboard's E2E layer and any browser-driven data-gathering or execution. Not needed by the headless engine yet. |

`tsc` runs with `strict`, `noUncheckedIndexedAccess`, and `verbatimModuleSyntax` — the
compiler is the first line of defense, so we keep it maximally paranoid.

## Test-Driven, Behavior-Driven

- **TDD:** write the failing spec first, then the code that makes it pass. Tests are not an
  afterthought — they are how we design the interface.
- **BDD, not implementation testing:** specs assert on *observable behavior* — the intents a
  persona produces, the fills a broker returns, the equity after a cycle — never on private
  fields or call counts. This is what lets us refactor internals freely.
  - See `tests/personas/news-fader.spec.ts`: it feeds a market and asserts "sells the position",
    with no knowledge of *how* the decision is reached.
- Spec structure mirrors behavior: `describe("when <situation>") → it("<expected behavior>")`.

### Requirements in EARS (the upstream half of BDD)

Before the failing spec, state the **requirement** in **EARS** (Easy Approach to Requirements
Syntax). One requirement per statement, a **named system**, a single **verifiable** response, the
word **shall**. Five patterns cover ~everything; reach for the simplest that fits:

| Pattern | Template | Cue |
|---|---|---|
| **Ubiquitous** (always true) | `The <system> shall <response>.` | — |
| **Event-driven** | `WHEN <trigger>, the <system> shall <response>.` | WHEN |
| **State-driven** | `WHILE <state>, the <system> shall <response>.` | WHILE |
| **Unwanted behavior** | `IF <condition>, THEN the <system> shall <response>.` | IF/THEN |
| **Optional feature** | `WHERE <feature is present>, the <system> shall <response>.` | WHERE |
| **Complex** | combine, e.g. `WHILE <state>, WHEN <trigger>, the <system> shall <response>.` | — |

**EARS *is* our BDD grammar, one layer up** — the mapping is mechanical, which is why we adopt it:
the `WHEN/WHILE/IF/WHERE` clause becomes the `describe("when …")`, and the `shall <response>`
becomes the `it("<response>")`. So one EARS line ⇒ one spec.

> **EARS:** `WHEN the persona sees the position at its take-profit target, the persona shall close it.`
> **Spec:** `describe("when the position hits its take-profit target") → it("closes the position")`.

Write EARS acceptance criteria in plans, issues, and PRs; the `/ears` drill
(`.claude/skills/ears/SKILL.md`) classifies a raw request into these patterns and scaffolds the
matching specs. Anti-patterns EARS kills: vague "should/support/handle", compound requirements
(one `shall` per line), and unverifiable responses (if a spec can't assert it, rewrite it).

**Automated enforcement (Claude Code hooks).** The red-green-refactor loop is backed by harness
hooks in `.claude/settings.json`, so the suite runs deterministically, not just when someone
remembers:
- **PostToolUse** (`.claude/hooks/skynet-tdd-postedit.sh`) — on every `.ts` edit under
  `skynet-capital/`, runs typecheck + tests and feeds any failure straight back into context.
  Non-blocking: it's a safety net for the green/refactor phases, not a gate.
- **Stop** (`.claude/hooks/skynet-tdd-stop.sh`) — end-of-turn backstop; runs typecheck + tests +
  lint and warns if the turn left anything red.
- Shared test data lives in `tests/support/builders.ts` — specs state only the fields they care
  about. No copy-pasted fixtures.

## DRY, with a bias toward one owner per concept

- Valuation math lives once in `src/domain/portfolio.ts`. The engine, guards, and reports all
  call it — nobody re-derives "equity".
- Risk lives once in `src/engine/guards.ts`. Personas never check cash or limits; the engine
  clamps every intent through one guard pipeline. Add a limit there and every persona inherits it.
- Signal math (momentum, sentiment) is computed by the market-data port, not inside personas.

## Decomposition — explicitly named modules, no dumping grounds

A generic `utils.ts` becomes a junk drawer that does everything and is safe to change nowhere.
We don't have one, and we won't add one. Instead:

- Helpers live in the **explicitly named module they belong to**: portfolio math in
  `domain/portfolio.ts`, persona-reasoning helpers in `personas/persona.ts`, risk in
  `engine/guards.ts`.
- If a helper doesn't have an obvious named home, that's a signal the concept it serves hasn't
  been named yet — name it and give it a file, don't file it under "utils".
- Folder structure encodes the architecture, so structure alone tells you where behavior lives:

```
src/
  domain/     pure types + pure math (no I/O, no mutation)
  ports/      interfaces at the system boundary (BrokerPort, MarketDataPort)
  adapters/   concrete implementations of ports (in-memory today, Alpaca next)
  personas/   strategies — pure decide(context, portfolio) => intents
  engine/     orchestration + risk (owns the cycle, owns the guards)
```

## Ports & Adapters (Hexagonal)

The engine depends on **interfaces**, never on concrete brokers or feeds. That's what lets the
same engine drive the in-memory paper simulator in tests and a live Alpaca paper account in
production with no code change. New execution or data backends are new adapters, nothing else.

## Component libraries & consistent look/feel

When the dashboard arrives, UI is built from a shared component library — reusable, modular
components with one source of truth for look, feel, and behavior. No bespoke one-off widgets,
no god components. The same principle the backend already follows, applied to the frontend.

## State management — the deliberate stance

The question of whether a tool like **Redux Toolkit** helps is really a question about
*legibility*: a single, explicit, serializable state shape with typed transitions is far cheaper
to read, extend, and reason about (for humans and for agents) than mutations scattered across
modules. We buy that principle in full. Where we apply it differs by layer:

- **The eventual dashboard (React): yes, Redux Toolkit is the likely choice.** Normalized store,
  typed slices, one source of truth for what the UI is showing.
- **The headless engine: adopt the *pattern*, not the dependency.** Engine and account state is
  already an explicit, typed, serializable shape (`Portfolio`, `CycleReport`) with transitions
  modeled as data (`OrderIntent` → `OrderResult`). That is a reducer in spirit. Pulling a
  React-oriented state library into a Node trading loop adds weight for no gain — the value is the
  *shape and the discipline*, and we already have those. If the engine's state graph grows complex
  enough to warrant a formal event-sourced store, we revisit then, with that evidence in hand.

The through-line: state is explicit, typed, and serializable everywhere, because that is what
makes the system cheap to extend — including by an agent reading it fresh.

## Lovable DX / UX

- Every `OrderIntent` carries a human-readable `reason`. Replaying a session reads like a
  narrative, which is exactly what the weekly touch-point recaps and the learning loop need.
- `npm run lint:fix` and `npm test` are the whole inner loop. Fast feedback, no ceremony.
- Errors are values where it matters: brokers return a rejected `OrderResult` with a `reason`
  rather than throwing, so callers handle outcomes uniformly.

## Change communication — commits & PRs are documents

Commits and pull requests are the project's durable record: how a non-author (a teammate, a future
bot, Eric six months on) reconstructs *what changed and why*. As engagement grows, more members will
read PRs to follow along — many **analytical but non-technical** (they think like engineers without the
formal background). Write for them. Structure follows the inverted pyramid: **most important first, the
weeds below the fold.**

**Commits — concise and articulate.** [Conventional Commits](https://www.conventionalcommits.org)
(enforced by commitlint), lowercase-led subject, imperative mood ("add", not "added") — the classic
[Chris Beams rules](https://cbea.ms/git-commit/). The subject says *what*; the body says *why* and any
non-obvious *how*. One logical change per commit — in-PR commits are working granularity that helps a
reviewer (and Claude) navigate before merge.

**Squash-merge is configured to use the PR title + PR description**, so on `main` the **PR description
becomes the squash commit's body** and `semantic-release` analyzes it. Two consequences: the **PR title
must be a valid Conventional-Commit subject** (it becomes the commit subject and drives the version
bump), and the **PR description — not the in-PR commit bodies — is the durable record**. Write it as the
thing a future reader will `git log` on `main`.

**PRs — a document with a fold** (mirror [`.github/pull_request_template.md`](../.github/pull_request_template.md)):

1. **Summary** — the gist in plain language, skimmable by a non-technical reader: what ships.
2. **Why** — the intent / user value in a sentence or two.
3. **Details, below the fold** (`<details>`): the file-level walkthrough, design trade-offs (link an
   ADR for hard-to-reverse calls), verification, risk/rollback, follow-ups. The weeds live here so the
   top stays legible; the depth is one click away for whoever wants it.

**Quality bar — succinct & high-signal.** The description is `main`'s commit body; make every line earn
its place:

- **Lead with the outcome, not the process.** The first line is what's *true after merge*, in plain
  language a non-technical reader skims in ten seconds.
- **Don't restate the diff.** The diff already shows *which lines* changed; the description says *why it
  matters* and *what it enables*. Cut any bullet that just narrates code.
- **1–3 Summary bullets.** If the Summary needs more, it's probably two PRs (or a batched suite whose
  bullets should each name a shipped capability, not a step).
- **No filler, no hedging.** Drop "this PR does…", "various improvements", "as requested". Name the *one*
  non-obvious decision, not every obvious one.
- **A diagram only when a structure is faster seen than read** (a Mermaid graph for a new data flow or
  route map) — chiefly for human readers; skip it when a sentence is clearer.

Keep it proportional — a one-line typo fix is a one-line description, not a populated template (don't tax
flow with ceremony; see the interrupt-economics principle). The template is a layout to populate, not a
checklist to satisfy.

### Guarding the shared record (higher-stakes trust)

Members are welcome to open issues suggesting *how information is presented* — clearer summaries, better
templates, naming. These are valuable. But changes to the **shared communication standard itself** (this
section, the PR template, the commit convention) shape everyone's environment, so they clear a **higher
review bar** than a feature: Claude reviews them **at Eric's level of scrutiny**, because a well-meaning
but muddying change can quietly pollute the record and hurt everyone's experience. This is the
autonomous-contribution trust ladder applied to the record: additive/display contributions are low-risk;
edits to shared standards are not, and are gated accordingly (see
[`LIVING-UNIVERSE.md`](LIVING-UNIVERSE.md)).

### Releases and the protected `main`

`semantic-release` runs on every push to `main` (the `deploy` job) and does three things: work out the
next version from the Conventional-Commit history, create the **git tag + GitHub Release**, and bump
`package.json` **in the runner's workspace** — which is the same workspace `flyctl deploy` then ships,
so the deployed app reports the correct version (`src/server/auth/app-version.ts`).

**It deliberately does NOT push the version bump back to `main`.** The `@semantic-release/git` plugin
was removed because branch protection correctly rejects a direct push (`GH006: Changes must be made
through a pull request. Required status check "verify" is expected.`) — which silently broke **every
deploy** for several merges until it was caught. The version of record is the **git tag**, not the
committed `package.json`, so the repo's `package.json` version will lag; that is expected.

To restore the committed bump, the release identity needs a branch-protection bypass on `main` (an
Eric-only governance change) — then `@semantic-release/git` can be added back.

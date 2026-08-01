# Battle of the Wits — working notes for Claude

A **portable engineering harness** for Claude Code, distributed as a plugin marketplace. It is the
quality system that grew inside [`skynet-capital`](https://github.com/ejclark/skynet-capital), lifted
out so it can run in any repository.

This repo's product **is** the operating model. That inverts the usual relationship: here, doctrine is
not overhead on the work — doctrine is the work.

## The one rule everything else falls out of

**The harness carries the procedure; the target repo carries its own state.**

Every time a decision is unclear, ask which side of that line it falls on. Budgets, exemptions,
layout, and history belong to the repo being worked on. Drills, gates, agents and doctrine belong
here. A value that has to be true for *one particular project* has no business in this repository.

The failure mode this prevents is the one this harness was built to avoid: **configuration drift**.
There is exactly one instance of the harness, so there is nothing to drift from — but only as long as
project-specific values stay out of it.

## Portability is a claim until a test proves it

`tests/portability.test.mjs` is the load-bearing suite. It builds a throwaway repo with a
deliberately **non-default** layout (`lib/` + `spec/`), points the gates at it, and requires each one
to catch a **planted** violation.

That last part is the whole design. A scanner aimed at a directory that doesn't exist finds no
problems and exits 0 — a false green indistinguishable from success. Every case here plants a known
defect so a gate that scanned nothing **fails**. When adding a gate, add its planted-violation case;
a test that only asserts "exit 0" is worse than no test.

Three real defects surfaced this way on day one, all of them project accidents that rode along in the
lift: hardcoded `src/` prefixes, skynet-specific spec exemptions, and a crash when `knip` was absent.
Assume more are hiding.

## Adding or changing a gate

1. It reads its paths from `harness.json` (see [`docs/DESCRIPTOR.md`](docs/DESCRIPTOR.md)) — never
   from an assumption about layout. Missing descriptor means documented defaults, never inference.
2. It **grandfathers**: with no committed budget, freeze today's debt rather than blocking. A gate
   that demands a flag-day cleanup will be turned off.
3. It **ratchets down only**: `--update` may lower a budget, never raise it. Improvement is permanent.
4. It **degrades honestly**: if it cannot measure (a missing tool, an empty repo), say so and exit 0.
   A gate that cannot measure must not render a verdict in either direction.
5. Implementation lives in `plugins/harness-gates/lib/*.mjs`; `bin/` holds only the thin launcher.

## Ship loop

- Branch off latest `origin/main` before editing; small focused PRs; squash-merge on green.
- Conventional Commits, **lowercase-led subjects** (commitlint rejects a capitalized first word).
- Verify before pushing: `npm test`, `npm run validate`, `node scripts/sync-versions.mjs --check`.
- **Never hand-edit a `version` field.** The release owns it and `scripts/sync-versions.mjs` writes
  it to every manifest. A manifest version that disagrees with the release is silent breakage —
  installs go stale with nothing red.
- The pipeline is two mutually-exclusive jobs: `verify` on PRs, `release` on merge to `main`. Merged
  commits are never re-verified; branch protection already required `verify`.

## What does not belong here

- Anything true of only one project (its budgets, its exemptions, its deploy target, its brand).
- A **control surface**. Every config option is a decision the system failed to make — if the harness
  can decide from evidence, it should, and if a human must decide, that decision is almost certainly
  in the irreversible class and belongs to Eric rather than to a settings file.
- Credentials, tokens, or anything that grants cross-repo write access. Build the mechanism; hand
  Eric the one credentialed step.

## Status

Early, and honest about it: proven in exactly one codebase. The real test of a portable system is
expressing it somewhere it did not grow. Until that has happened more than once, "portable" stays a
claim — and the `README` says so on purpose.

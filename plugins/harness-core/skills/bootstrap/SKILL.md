---
description: Drop the full engineering process into a repository in one shot — CI pipeline, Conventional Commits, semantic-release, Biome, git hooks, the capability descriptor, the lessons ledger, and the quality gates wired into the test suite. Use when adopting the harness in a new repo, when asked to "bootstrap", "set up the harness", "lift and shift the process", or when a repo has the plugins installed but no plumbing to run them.
---

# The one-shot

Installing `harness-core` and `harness-gates` gives a repository the **drills and the gates**. It does
not give it the **plumbing that makes them run** — the pipeline, commit linting, releases, the
formatter, git hooks, and the wiring that puts the gates inside the test suite. This drill drops that
in, in a version already proven green.

## Run it

```shell
harness-bootstrap --dry-run   # always do this first — shows the plan, touches nothing
harness-bootstrap             # writes what's missing, never clobbers
```

`--force` overwrites existing files. It is destructive; only use it when the user explicitly asks to
reset their config.

## What it writes

| Area | Files |
|---|---|
| Lint / format | `biome.json` |
| Commits | `commitlint.config.js` (Conventional Commits) |
| Releases | `.releaserc.json` (semantic-release) |
| Gates' tooling | `knip.json`, `.jscpd.json` |
| Node | `.npmrc` (`save-exact`), `.nvmrc` |
| Descriptor | `harness.json` — the interface every gate reads |
| Git hooks | `.husky/pre-commit` (format staged), `commit-msg` (commitlint), `pre-push` (full local gate) |
| CI | `.github/workflows/pipeline.yml`, `.github/pull_request_template.md` |
| Gate wiring | `<testDir>/arch/gates.spec.ts` — the gates run **inside** the suite |
| Learning | `docs/LESSONS.md` |
| `package.json` | **merged**, never replaced — adds scripts + devDependencies, existing keys win |

## After it runs

1. `npm install`
2. **Freeze today's debt as the budget** — run each gate with `--update`:
   `harness-arch-scan --update`, and the same for `dupe`, `dead`, `spec-gap`, `clone`.
   This is the grandfathering step. Without it the first run blocks on debt the repo already had,
   which is exactly the flag-day cleanup the ratchet design exists to avoid.
3. Commit, open a PR, confirm `verify` goes green.
4. Turn on branch protection requiring `verify`, and enable auto-merge. **This is the user's step** —
   it needs repo admin, and the pipeline is written assuming it exists (the `release` job
   deliberately does not re-verify).

## Rules this drill follows

- **Never clobber.** An existing file is a decision someone made. It gets reported as skipped, not
  overwritten. If the user wants a reset, they ask for `--force`.
- **Say what it imposes.** Conventional Commits, semantic-release owning the version, ratcheting
  gates, and CI-is-confirmation-not-first-defense are *opinions*. The summary names them so the user
  disagrees deliberately rather than discovering it three weeks later.
- **Review the workflow file before committing.** `.github/workflows/` changes what runs with the
  repository's credentials — it is a reviewed change, never an auto-merged one.
- **Adapt, don't fight.** A repo that already has a `lint` script or its own formatter keeps them.
  Report the divergence and let the user reconcile; a bootstrap that overwrites working config is
  worse than no bootstrap.

## When it doesn't apply

The templates are Node/TypeScript-shaped. In a Python or Go repo, the descriptor and the drills still
work, but the config templates do not — write the equivalent by hand and say so plainly rather than
dropping in a pipeline that cannot run.

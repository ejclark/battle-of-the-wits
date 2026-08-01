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

## The sequence

Adoption is a **progression**, not a checklist, and the order carries real dependencies. Ask the
drill where you are at any point:

```shell
harness-bootstrap --plan
```

It reads the repo, marks what's done, and names the single next action. The phases group steps by
**blast radius**, and each earns the next:

| Phase | What happens |
|---|---|
| **1 · Install** | Write the files, then `npm install`. Nothing works until this completes — husky's `prepare` builds the hook runner, so hooks written in step 1 are inert until step 2. |
| **2 · Observe** | Run the gates with no budgets. They report and pass. This is the honest look at what you inherited. |
| **3 · Freeze** | Grandfather today's debt with `--update`, verify locally, commit, open a PR. |
| **4 · Enforce** | Require `verify` on main — **after** it has gone green once. |
| **5 · Autonomy** | Enable auto-merge, then let the background athletes burn debt down. |

### The two ordering traps

Both are silent, and both are how an adoption fails and takes the harness's credibility with it.

**Freeze the debt *before* the gates run in CI.** A ratcheting gate with no committed budget measures
the repo's entire existing debt as new. The adopter's first PR goes red for code they didn't touch,
they conclude the gates are noise, and they switch them off. Grandfathering is what makes the gates
adoptable at all — it is not optional polish.

**Require the check *after* it has passed once.** Turning on branch protection for a check that has
never reported leaves every PR wedged on "waiting for status" with no error to read.

### Phases 4 and 5 are the user's

Both need repo admin, and both are the irreversible class — never self-authorize them. Hand over the
exact settings to change and why. Note also that autonomy comes **last on purpose**: it is earned by
verification, never assumed, which is the same bet as automerging dependency updates only once the
tests underneath are real.

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

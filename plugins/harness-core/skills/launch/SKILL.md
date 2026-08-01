---
name: launch
description: >-
  Take a new project from nothing to a GitHub repository with the full pipeline running — repo
  created, harness adopted in one shot, gates frozen, hooks live, CI green, branch protection named
  for the owner. Use when someone wants to start a project, when asked to "set up a new repo",
  "get CI going", or "scaffold this like dungeon-crawler". Verifies every precondition rather than
  assuming any of them. Invokable as /launch.
---

# Launch — nothing to a repository that defends itself

`harness-bootstrap --auto` is the one shot and it already does the mechanical middle. This drill is
the two ends it cannot reach: **there is no repository yet** at the front, and **branch protection
needs credentials** at the back. Everything between those is one command.

## The rule that governs the whole drill

> **Assume nothing is set up. Verify each precondition, and say what you found.**

Not caution for its own sake — this project's bootstrap wrote git hooks and a CI pipeline into a
directory with no `.git` at all and reported success. Every file landed and none of the protection
did. **A setup that assumes its preconditions produces a directory that looks equipped and enforces
nothing**, which is worse than one that obviously failed, because nobody goes looking.

So check, out loud, and narrate what you find. The check costs seconds; discovering it in week three
costs the trust in every green check since.

## What the rails are actually for

Say this once, plainly, because the framing matters and the wrong one sticks:

**The rails are not training wheels.** Biome, the hooks, the gates, branch protection — an
experienced developer benefits from every one of them just as much, they simply notice less often
that they were caught. Nobody here gets a stricter setup because they are new, and nobody gets a
looser one because they are not.

**What varies is who drives and how much gets narrated**, and that is a decision about the session
rather than about the person. On a first project: you type, they watch, and you say what each step is
for. On a later one: they type and you answer questions. The end state is byte-identical either way.

## 0 · Verify the ground, before touching anything

Run these and report what you find. Do not skip one because it "must" be there.

```bash
git --version                 # git at all
git config user.name          # an identity, or commits fail confusingly
git config user.email         # ditto — and see the privacy note below
node --version                # 22+ for this harness
gh auth status 2>/dev/null    # optional; the web UI covers everything it does
```

Two that are worth stopping for:

- **No git identity** → set it now. Missing identity produces an error at commit time that reads as a
  problem with the project rather than with a setting.
- **Email privacy** → if this account is new, `git config user.email` should be the
  `users.noreply.github.com` address, *before the first commit*. Every commit permanently publishes
  whatever is configured, and no revert retracts it. This is the one step here that cannot be redone.

## 1 · Create the repository

Owner-side if it belongs to an organisation; otherwise theirs. In the browser, or `gh repo create`.

Four choices, and only two are hard to undo:

| Choice | Reversible? |
|---|---|
| **Name** | renameable, but every existing link breaks — this project has a whole gate about it |
| **Public or private** | **Public → private does not un-publish.** Anything pushed while public is out |
| **License** | addable later; absent means nobody may legally use it |
| Description, topics | freely |

**Default to private for a first project.** Not because the work is embarrassing — because *public
is the irreversible direction*, and going private→public later is one click while the reverse is not
a thing. A repository can be opened up the day there is a reason to.

Initialise with a README so the default branch exists. Clone it, or open it in a Codespace if they
would rather not install anything.

## 2 · The one shot

```bash
harness-bootstrap --auto
```

That writes the toolchain — Biome, commitlint, semantic-release, knip, jscpd, the descriptor, the
Claude settings and status line — installs the git hooks, runs the install, **freezes every budget**,
verifies, and commits. It stops before pushing on purpose: everything up to that point is local and
reversible, and a bootstrap that pushed into someone's repository by default would not be one people
run twice.

**The freeze is the step that matters and the one to narrate.** It records today's debt as the
starting line so the gates block *growth* rather than history. Skip it and their first pull request
goes red for code they did not write, they conclude the gates are noise, and the gates get turned
off — permanently, and for a good reason. `${CLAUDE_PLUGIN_ROOT}/docs/DESCRIPTOR.md` has the detail;
the sequence itself carries the two ordering traps inline.

If the run reports **not a git repository**, stop — step 1 did not finish.

## 3 · Push, and let CI report once

```bash
git push -u origin main
```

Watch the pipeline run. **This is the moment worth staying for**: the first green check is the first
evidence that any of this works, and if it is red the reason is nearly always one of two boring
things — a missing lockfile, or a node version mismatch with `.nvmrc`.

## 4 · The handover — owner-side, and it cannot be automated from here

These need repository-admin credentials. Name them precisely; "configure your repo" is not a handover.

1. **Require the `verify` check on the default branch** — Settings → Branches → branch protection.
   **After it has passed once.** Requiring a check that has never reported leaves every pull request
   stuck on *waiting for status* with no error to read, and it is the second ordering trap in the
   sequence.
2. **Allow auto-merge** — Settings → General.
3. **Require pull requests to the default branch**, so nothing lands unreviewed.

Anything touching credentials, workflow permissions or org settings stays with the owner. Never walk
someone through granting themselves access.

## 5 · Hand back the loop, not a finished project

The repository now defends itself. What it does not have is momentum, so end by pointing at the
thing that produces work rather than at a checklist:

> **Read something → hit a snag → fix it or log it → ship it → read the next thing.**

And name the first snag they will hit, because there always is one: `harness.json` ships with
documented defaults that describe a conventional TypeScript project. If theirs is not that, the
gates measure the wrong directory and report a confident zero. `harness-standing --zoning` prints
the layout actually in use — check it against reality before believing any green.

## Boundaries

- **Never create a repository under someone else's account or organisation**, and never accept
  credentials to do it. The owner creates, or they create their own.
- **Never enable branch protection, auto-merge, or an App grant on their behalf.** Name them; hand
  them over.
- **Never push during a first run without saying so first.** `--auto` stops before pushing by design;
  `--ship` opts in and is the owner's call, not a default.
- **Do not tune the harness to the person.** The setup is identical for everyone; the narration is
  what changes. A quietly weakened rail is a rail nobody can trust later, including them.

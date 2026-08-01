---
name: ship
description: >-
  Land a verified branch as a PR the resource-cheap way: local verify → push → open the PR over
  REST (the plentiful core bucket) → one auto-merge call → STOP. No polling; the merge webhook is
  the completion signal. Use whenever you're opening a PR or merging a green branch in this repo,
  and instead of hand-rolling the GitHub MCP PR dance (which spends the scarce GraphQL bucket by
  the thousands). Wraps harness-ship.
---

# /ship — the cheap, no-poll path to landing a PR

The mechanics live in `harness-ship` (a one-time build cost, ~free per run). This skill is the
**policy** that makes the model reach for it instead of the expensive habit. The rule that matters:
**never poll GitHub for status, and never route bulk operations through the GraphQL MCP.**

## Why (the constraint this protects)

`git` and repo-scoped **REST** run on your machine / the **core** bucket (15k/hr, barely touched).
The GitHub **MCP** spends **GraphQL** (5k/hr) — one MCP PR-create+auto-merge+read cycle measured
**~6,000 points**, enough to exhaust the bucket by itself; repeated status-polling is what actually
drained it. See `https://github.com/ejclark/battle-of-the-wits/blob/main/plugins/harness-core/docs/COACHES.md` → *Resource cost is a fitness dimension*.

## The flow

1. **Verify locally first.** `harness-ship open` runs `npm run verify` (parity with CI) and
   refuses to push on red — never spend a runner or a PR on a known loser.
2. **Open over REST.** It pushes the branch and `POST`s the PR on the core bucket, printing the PR
   number. (If the proxy blocks REST writes, it exits 2 and tells you to fall back to **one**
   `mcp__github__create_pull_request` call — one call, not thousands.)
3. **Arm auto-merge — the one required GraphQL call.** Make exactly **one**
   `mcp__github__enable_pr_auto_merge` (SQUASH). That's ~1 point/PR — trivial; the problem was never
   a single arm call, it was polling. This gives server-side merge-on-green even if the session ends.
   **This call is not optional for `main`:** direct REST merge into a protected branch is refused for
   this session type (`403 "Merging into a protected base branch is not permitted for this session
   type"`), so native auto-merge is the *only* way this session can land a PR on `main`.
4. **STOP. Do not poll.** No `list_pull_requests`, no `pull_request_read`, no status check-ins. The
   merge **webhook** is the completion signal — act when it arrives, not before.

**When GraphQL is exhausted** (can't make the arm call): don't wait or poll. **Eric web-merges** —
his browser session isn't rate-limited, and a green PR merges in one click. That's the escape hatch,
not `ship.sh merge`. (`harness-ship merge <n>` works only for an *unprotected* base branch — never
`main` here — so it's rarely used.)

## Carve-outs — never auto-land (open the PR, hand to Eric)

- **Workflow files** (`.github/workflows/**`) — high blast radius; Eric's one-click.
- **Credentials / spend / outward-facing irreversible class** (CLAUDE.md hard boundaries).
- **Visual/taste work Eric asked to eyeball first.**

For these: `harness-ship open` to create the PR, but do **not** arm auto-merge.

## Batching

Prefer one platter PR over many (fewer pushes, fewer opens, fewer merges = less of every finite
resource). Assemble athlete branches locally with `git`, verify once, `ship open` once.
